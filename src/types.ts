import "@hoda5/extensions"

export interface DocDecl<FIELDS extends DocFields> {
    name: string,
    fields: FIELDS,
}

export interface DocDef<FIELDS extends DocFields> {
    name: string,
    fields: FIELDS,
    purefields: PureField<FIELDS>
}

export type PureField<T> =
    T extends DocField<infer TYPE, any> ? TYPE :
    T extends ComplexField<infer COMPLEX> ? {
        [name in keyof COMPLEX]: PureField<COMPLEX[name]>
    } :
    T extends DocFields ? {
        [name in keyof T]: PureField<T[name]>
    } :
    T extends OptionsField<infer VALUE, any> ? VALUE
    : unknown

export interface DocFields {
    [name: string]: DocField<any, any> | ComplexField<any> | OptionsField<any, any>
}

function isComplex<T, CFG>(
    field: DocField<T, CFG> | ComplexField<T> | OptionsField<any, any>): field is ComplexField<T> {
    return !!(field as ComplexField<T>).validateChildren
}

function isOptions<OPTIONS extends Options, CFG extends DefaultFieldOpts>(
    field: DocField<any, any> | ComplexField<any> | OptionsField<OPTIONS, CFG>): field is OptionsField<OPTIONS, CFG> {
    return !!(field as OptionsField<OPTIONS, CFG>).fieldType.options
}

function isArray<OPTIONS extends Options, CFG extends DefaultFieldOpts>(
    field: DocField<any, any> | ComplexField<any> | OptionsField<OPTIONS, CFG>): field is OptionsField<OPTIONS, CFG> {
    return !!(field as OptionsField<OPTIONS, CFG>).fieldType.options
}

export interface DocField<T, CFG> {
    fieldName: string
    fieldType: DocFieldType<T, CFG>
    cfg: CFG,
    value: T,
    validate(): string | undefined,
}

export interface DocFieldArray<T, CFG> {
    fieldName: string
    fieldType: {
        typeName: string,
    }
    itemType: {
        typeName: string,
        validate(v: T, cfg: CFG): string | undefined,
    }
    value: T[]
    validate(): string | undefined,
}

interface DocFieldType<T, CFG extends DefaultFieldOpts> {
    typeName: string,
    sample: T,
    single: DocFieldInstance<T, CFG & DefaultFieldOpts>
    array(cfg: DefaultArrayOpts<CFG>): DocFieldArray<T, CFG>
    validate(v: T, cfg: CFG): string | undefined,
}

export interface DefaultFieldOpts {
    optional?: boolean
    hint?: string
}

export interface DefaultArrayOpts<CFG> {
    optional?: boolean
    hint?: string
    minItems?: number
    maxItems?: number
    itemOpts: CFG & DefaultFieldOpts
}

type DocFieldInstance<T, CFG extends DefaultFieldOpts> =
    ((cfg: CFG & DefaultFieldOpts) => DocField<T, CFG & DefaultFieldOpts>)

export const typeByName: { [name: string]: DocFieldType<any, any> } = {}

export function defType<T, CFG>(typeOpts: {
    typeName: string,
    sample: T,
    validate(value: T, cfg: CFG & DefaultFieldOpts): string | undefined,
}): DocFieldType<T, CFG & DefaultFieldOpts>
    & DocFieldInstance<T, CFG> {
    const { typeName, sample, validate } = typeOpts
    if (typeByName[typeName]) throw new Error("Duplicated typename " + typeName)

    const tp: DocFieldType<T, CFG & DefaultFieldOpts> = {
        typeName,
        sample,
        single,
        array,
        validate,
    }
    const type = tp.mergeObjWith(single)
    typeByName[typeName] = type
    return type

    function single(cfg: CFG & DefaultFieldOpts) {
        const f: DocField<T, CFG & DefaultFieldOpts> = {
            fieldName: undefined as any,
            value: undefined as any,
            fieldType: type,
            cfg,
            validate() {
                return type.validate(f.value, f.cfg)
            },
        }
        return f
    }
    function array(arrayOpts: DefaultArrayOpts<CFG>) {
        const a: DocFieldArray<T, CFG> = {
            fieldName: undefined as any,
            value: undefined as any,
            fieldType: {
                typeName: type.typeName + "[]",
            },
            itemType: type,
            validate() {
                const v = a.value
                const l = v && v.length || 0
                if (l > 0) {
                    if (arrayOpts.minItems && l < arrayOpts.minItems) return "Mínimo: " + arrayOpts.minItems
                    if (arrayOpts.maxItems && l > arrayOpts.maxItems) return "Máximo: " + arrayOpts.maxItems
                    let err: string | undefined
                    v.some((i) => {
                        err = type.validate(i, arrayOpts.itemOpts)
                        return err !== undefined
                    })
                    if (err) return err
                } else if (!arrayOpts.optional) return "Obrigatório"
                return undefined
            },
        }
        return a
    }
}

export function configField<T, CFG>(field: DocField<T, CFG>, cfg: {
    name: string,
    onGet(): T,
    onSet(value: T): void,
}) {
    Object.defineProperties(field, {
        fieldName: { value: cfg.name },
        value: {
            get: cfg.onGet,
            set: cfg.onSet,
        },
    })
}
export function configArray<T, CFG>(field: DocFieldArray<T, CFG>, cfg: {
    name: string,
    onGet(): T[],
    onSet(value: T[]): void,
}) {
    Object.defineProperties(field, {
        fieldName: { value: cfg.name },
        value: {
            get: cfg.onGet,
            set: cfg.onSet,
        },
    })
}

export function defDoc<FIELDS extends DocFields>
    (dd: DocDecl<FIELDS>): DocDef<FIELDS> {
    return null as any
}

export const stringType = defType<string, {
    minLen?: number,
    maxLen?: number,
}>({
    typeName: "string",
    sample: "",
    validate(value, cfg) {
        if (typeof value === "string") {
            if (cfg.minLen && value.length < cfg.minLen) return "Tamanho mínimo: " + cfg.minLen
            if (cfg.maxLen && value.length > cfg.maxLen) return "Tamanho máximo: " + cfg.maxLen
        } else if (value) return "Tipo do dado inválido (" + typeof value + ")"
        else return "Obrigatório"
        return undefined
    },
})

export const numberType = defType<number, {
    min?: number,
    max?: number,
}>({
    typeName: "number",
    sample: 0,
    validate(value, cfg) {
        if (typeof value === "number") {
            if (cfg.min && value < cfg.min) return "Mínimo: " + cfg.min
            if (cfg.max && value > cfg.max) return "Máximo: " + cfg.max
        } else if (value) return "Tipo do dado inválido (" + typeof value + ")"
        else return "Obrigatório"
        return undefined
    },
})

export const DateISOType = defType<DateISO, {
    min?: DateISO,
    max?: DateISO,
}>({
    typeName: "DateISO",
    sample: "2018-10-27T12:00:00.000Z".toDateISO(),
    validate(value, cfg) {
        if (typeof value === "string") {
            if (cfg.min && value < cfg.min) return "Mínimo: " + cfg.min
            if (cfg.max && value > cfg.max) return "Máximo: " + cfg.max
        } else if (value) return "Tipo do dado inválido (" + typeof value + ")"
        else return "Obrigatório"
        return undefined
    },
})

export const booleanType = defType<boolean, {}>({
    typeName: "boolean",
    sample: false,
    validate(value, cfg) {
        if (typeof value !== "boolean") return "Obrigatório"
        return undefined
    },
})

export interface ComplexField<FIELDS> {
    fieldType: {
        fields: FIELDS,
        sample: PureField<FIELDS>,
    },
    validateChildren(values: PureField<FIELDS>): string | undefined,
    defType<CFG>(typeOpts: {
        typeName: string,
        validate?(value: PureField<FIELDS>, cfg: CFG & DefaultFieldOpts): string | undefined,
    }): DocFieldType<PureField<FIELDS>, CFG & DefaultFieldOpts>
        & DocFieldInstance<PureField<FIELDS>, CFG & DefaultFieldOpts>
}

export function complex<FIELDS extends DocFields>(fields: FIELDS): ComplexField<FIELDS> {
    const sample = makeDefault()
    const _complex: ComplexField<FIELDS> = {
        fieldType: {
            fields,
            sample,
        },
        validateChildren(values: PureField<FIELDS>): string | undefined {
            return _validateChildren("", fields, values)
        },
        defType<CFG>(typeOpts: {
            typeName: string,
            validate?(value: PureField<FIELDS>, cfg: CFG & DefaultFieldOpts): string | undefined,
        }): DocFieldType<PureField<FIELDS>, CFG & DefaultFieldOpts>
            & DocFieldInstance<PureField<FIELDS>, CFG & DefaultFieldOpts> {

            const validate = typeOpts.validate

            return defType<PureField<FIELDS>, CFG & DefaultFieldOpts>({
                ...typeOpts,
                sample,
                validate(value: PureField<FIELDS>, fieldOpts: CFG & DefaultFieldOpts) {
                    if (value) {
                        const err = _complex.validateChildren(value)
                        if (err) return err
                        if (validate) return validate(value, fieldOpts)
                    } else if (!fieldOpts.optional) return "Obrigatório"
                    return undefined
                },
            })
        },
    }
    return _complex

    function _validateChildren(
        path: string,
        pfields: { [name: string]: DocField<any, any> | ComplexField<any> | OptionsField<any, any> },
        pvalues: any): string | undefined {
        let err: string | undefined
        pvalues = pvalues || {}
        Object.keys(pfields).some((p) => {
            const f = pfields[p]
            const v = pvalues[p]
            if (isComplex(f)) {
                err = _validateChildren([path, p, "/"].join(""), f.fieldType.fields, v)
            // } else if (isArray(f)) {
            //     err = _validateArray([path, p, "/"].join(""), f.fieldType.fields, v)
            } else {
                const fv: any = f.fieldType.validate
                err = fv(v, f.cfg)
                if (err) {
                    err = [err, " [", path, p, "]"].join("")
                    return true
                }
            }
            return false
        })
        return err
    }

    function makeDefault() {
        const r: PureField<FIELDS> = {} as any
        Object.keys(fields).forEach((p) => {
            r[p] = fields[p].fieldType.sample
        })
        return r
    }
}

export interface Options {
    [name: string]: Option
}

export interface Option {
    value: number,
    text: string,
}

export type OptionsType<OPTIONS extends Options> =
    DocFieldType<number, DefaultFieldOpts>
    & {
        options: Array<{ id: string, value: number, text: string }>,
    }
    & {
        [name in keyof OPTIONS]: number
    }
    & (<CFG extends DefaultFieldOpts>(cfg: CFG) => OptionsField<OPTIONS, CFG>)

export interface OptionsField<OPTIONS extends Options, CFG extends DefaultFieldOpts> {
    fieldName: string
    fieldType: OptionsType<OPTIONS>,
    cfg: CFG,
    value: number,
    validate(): string | undefined,
}

export function options<OPTIONS extends Options>(
    typeName: string,
    optionsCfg: OPTIONS): OptionsType<OPTIONS> {
    const options_arr: Array<{ id: string, value: number, text: string }> = []
    const options_values: {
        [name in keyof OPTIONS]: number
    } = {} as any
    mount()
    const ft: DocFieldType<number, DefaultFieldOpts> = {
        typeName,
        sample: options_arr[0].value,
        single,
        array,
        validate,
    }
    const type = {
        ...ft,
        options: options_arr,
    }
        .mergeObjWith(options_values)
        .mergeObjWith(single)
    return type
    function mount() {
        Object.keys(optionsCfg).forEach((id: keyof OPTIONS) => {
            options_arr.push({ id }.mergeObjWith(optionsCfg[id]) as any)
            options_values[id] = optionsCfg[id].value
        })
    }
    function single<CFG extends DefaultFieldOpts>(cfg: CFG): OptionsField<OPTIONS, CFG> {
        const f: OptionsField<OPTIONS, CFG> = {
            fieldName: undefined as any,
            value: undefined as any,
            fieldType: type,
            cfg,
            validate() {
                return type.validate(f.value, f.cfg)
            },
        }
        return f
    }
    function array<CFG extends DefaultFieldOpts>(cfg: DefaultArrayOpts<CFG>): DocFieldArray<number, CFG> {
        const a: DocFieldArray<number, CFG> = {
            fieldName: undefined as any,
            value: undefined as any,
            fieldType: {
                typeName: type.typeName + "[]",
            },
            itemType: type,
            validate() {
                const v = a.value
                const l = v && v.length || 0
                if (l > 0) {
                    if (cfg.minItems && l < cfg.minItems) return "Mínimo: " + cfg.minItems
                    if (cfg.maxItems && l > cfg.maxItems) return "Máximo: " + cfg.maxItems
                    let err: string | undefined
                    v.some((i) => {
                        err = type.validate(i, cfg.itemOpts)
                        return err !== undefined
                    })
                    if (err) return err
                } else if (!cfg.optional) return "Obrigatório"
                return undefined
            },
        }
        return a
    }
    function validate<CFG extends DefaultFieldOpts>(v: number, cfg: CFG): string | undefined {
        if (typeof v === "number") {
            if (type.options.some((o) => o.value === v)) return undefined
        }
        if (v === undefined) {
            if (cfg.optional) return undefined
            return "Obrigatório"
        }
        return "Valor inválido"
    }
}
