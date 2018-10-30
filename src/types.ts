import "@hoda5/extensions"
import i18n from "./i18n"

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
    T extends DocFieldArray<infer ARR, any> ? ARR[] :
    T extends DocFields ? {
        [name in keyof T]: PureField<T[name]>
    } :
    T extends OptionsField<infer VALUE, any> ? VALUE
    : unknown

export interface DocFields {
    [name: string]: DocField<any, any> | DocFieldArray<any, any> | ComplexField<any> | OptionsField<any, any>
}

// TODO
// function isComplex<T, CFG>(
//     field: DocField<any, any> | DocFieldArray<any, any> | ComplexField<T> | OptionsField<any, any>)
//     : field is ComplexField<T> {
//     return !!(field as ComplexField<T>).validateChildren
// }

// function isOptions<OPTIONS extends Options, CFG extends DefaultFieldOpts>(
//     field: DocField<any, any> | DocFieldArray<any, any> | ComplexField<any> | OptionsField<OPTIONS, CFG>)
//     : field is OptionsField<OPTIONS, CFG> {
//     return !!(field as OptionsField<OPTIONS, CFG>).fieldType.options
// }

// function isArray<OPTIONS extends Options, CFG extends DefaultFieldOpts>(
//     field: DocField<any, any> | DocFieldArray<OPTIONS, CFG> | ComplexField<any> | OptionsField<any, any>)
//     : field is DocFieldArray<OPTIONS, CFG> {
//     return !!(field as DocFieldArray<OPTIONS, CFG>).fieldType.validateArray
// }

export type MessageArgs<O> =
    O extends string ? [] :
    O extends (...args: any[]) => string ? Parameters<O> :
    never

export interface MessageDef {
    msg: string,
    path: string[]
}

export type MessageError = MessageDef | undefined

export function message<O extends object, P extends keyof O>(
    path: string[], o: O, p: P, ...args: MessageArgs<O[P]>): MessageDef {
    const f = o[p]
    const msg = typeof f === "function" ? f(...args) : f
    return {
        msg,
        path,
    }
}

export interface DocField<T, CFG> {
    fieldName: string
    fieldPath: string[]
    fieldType: DocFieldType<T, CFG>
    cfg: CFG,
    value: T,
    validate(): MessageError,
}

export interface DocFieldArray<T, CFG> {
    fieldName: string
    fieldPath: string[]
    fieldType: {
        typeName: string,
        sample: T[],
        validate(path: string[], items: T[], cfg: DefaultArrayOpts<CFG>): MessageError,
    }
    itemType: {
        typeName: string,
        validate(path: string[], value: T, cfg: CFG): MessageError,
    }
    cfg: DefaultArrayOpts<CFG>,
    value: T[]
    validate(): MessageError,
}

interface DocFieldType<T, CFG extends DefaultFieldOpts> {
    typeName: string,
    sample: T,
    single: DocFieldInstance<T, CFG & DefaultFieldOpts>
    array(cfg: DefaultArrayOpts<CFG>): DocFieldArray<T, CFG>
    validate(path: string[], v: T, cfg: CFG): MessageError,
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
    validate(path: string[], value: T, cfg: CFG & DefaultFieldOpts): MessageError,
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
            fieldPath: undefined as any,
            value: undefined as any,
            fieldType: type,
            cfg,
            validate() {
                return type.validate([], f.value, f.cfg)
            },
        }
        return f
    }
    function array(arrayOpts: DefaultArrayOpts<CFG>) {
        const a: DocFieldArray<T, CFG> = {
            fieldName: undefined as any,
            fieldPath: undefined as any,
            value: undefined as any,
            fieldType: {
                typeName: type.typeName + "[]",
                sample: [type.sample],
                validate: validateArray,
            },
            itemType: type,
            cfg: arrayOpts,
            validate() {
                return validateArray(a.fieldPath, a.value)
            },
        }
        return a
        function validateArray(path: string[], items: T[]): MessageError {
            const v = a.value
            const l = v && v.length || 0
            if (l > 0) {
                if (arrayOpts.minItems && l < arrayOpts.minItems) {
                    return message(path, i18n, "minLen", arrayOpts.minItems)
                }
                if (arrayOpts.maxItems && l > arrayOpts.maxItems) {
                    return message(path, i18n, "maxLen", arrayOpts.maxItems)
                }
                let err: MessageError
                items.some((i, idx) => {
                    err = type.validate([...path, idx.toString()], i, arrayOpts.itemOpts)
                    return !!err
                })
                if (err) return err
            } else if (!arrayOpts.optional) return message(path, i18n, "required")
            return undefined
        }
    }
}

export function configField<T, CFG>(field: DocField<T, CFG>, cfg: {
    fieldPath: string[],
    onGet(): T,
    onSet(value: T): void,
}) {
    Object.defineProperties(field, {
        fieldName: { value: cfg.fieldPath[cfg.fieldPath.length - 1] },
        fieldPath: { value: cfg.fieldPath },
        value: {
            get: cfg.onGet,
            set: cfg.onSet,
        },
    })
}
export function configArray<T, CFG>(field: DocFieldArray<T, CFG>, cfg: {
    fieldPath: string[],
    onGet(): T[],
    onSet(value: T[]): void,
}) {
    Object.defineProperties(field, {
        fieldName: { value: cfg.fieldPath[cfg.fieldPath.length - 1] },
        fieldPath: { value: cfg.fieldPath },
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
    validate(path, value, cfg) {
        if (typeof value === "string") {
            if (cfg.minLen && value.length < cfg.minLen) {
                return message(path, i18n, "minLen", cfg.minLen)
            }
            if (cfg.maxLen && value.length > cfg.maxLen) {
                return message(path, i18n, "maxLen", cfg.maxLen)
            }
        } else if (value) return message(path, i18n, "invalid", typeof value)
        else return message(path, i18n, "required")
        return undefined
    },
})

export const numberType = defType<number, {
    min?: number,
    max?: number,
}>({
    typeName: "number",
    sample: 0,
    validate(path, value, cfg) {
        if (typeof value === "number") {
            if (cfg.min && value < cfg.min) return message(path, i18n, "min", cfg.min)
            if (cfg.max && value > cfg.max) return message(path, i18n, "max", cfg.max)
        } else if (value) return message(path, i18n, "invalid", typeof value)
        else return message(path, i18n, "required")
        return undefined
    },
})

export const DateISOType = defType<DateISO, {
    min?: DateISO,
    max?: DateISO,
}>({
    typeName: "DateISO",
    sample: "2018-10-27T12:00:00.000Z".toDateISO(),
    validate(path, value, cfg) {
        if (typeof value === "string") {
            if (cfg.min && value < cfg.min) return message(path, i18n, "min", cfg.min)
            if (cfg.max && value > cfg.max) return message(path, i18n, "max", cfg.max)
        } else if (value) return message(path, i18n, "invalid", typeof value)
        else return message(path, i18n, "required")
        return undefined
    },
})

export const booleanType = defType<boolean, {}>({
    typeName: "boolean",
    sample: false,
    validate(path, value, cfg) {
        if (typeof value !== "boolean") return message(path, i18n, "required")
        return undefined
    },
})

export interface ComplexField<FIELDS> {
    fieldType: {
        fields: FIELDS,
        sample: PureField<FIELDS>,
        validate<CFG extends DefaultFieldOpts>(
            path: string[],
            values: PureField<FIELDS>,
            cfg: CFG & DefaultFieldOpts): MessageError,
    },
    cfg: {},
    defType<CFG>(typeOpts: {
        typeName: string,
        validate?(
            path: string[],
            values: PureField<FIELDS>,
            cfg: CFG & DefaultFieldOpts): MessageError,
    }): DocFieldType<PureField<FIELDS>, CFG & DefaultFieldOpts>
        & DocFieldInstance<PureField<FIELDS>, CFG & DefaultFieldOpts>
}

export function complex<FIELDS extends DocFields>(fields: FIELDS): ComplexField<FIELDS> {
    const sample = makeDefault()
    const _complex: ComplexField<FIELDS> = {
        fieldType: {
            fields,
            sample,
            validate(path, values, cfg) {
                return validateChildren(path, fields, values)
            },
        },
        cfg: {},
        defType<CFG>(typeOpts: {
            typeName: string,
            validate?(path: string[], value: PureField<FIELDS>, cfg: CFG & DefaultFieldOpts): MessageError,
        }): DocFieldType<PureField<FIELDS>, CFG & DefaultFieldOpts>
            & DocFieldInstance<PureField<FIELDS>, CFG & DefaultFieldOpts> {

            const optsValidate = typeOpts.validate

            return defType<PureField<FIELDS>, CFG & DefaultFieldOpts>({
                ...typeOpts,
                sample,
                validate(path: string[], value: PureField<FIELDS>, fieldOpts: CFG & DefaultFieldOpts) {
                    if (value) {
                        const err = _complex.fieldType.validate(path, value, fieldOpts)
                        if (err) return err
                        if (optsValidate) return optsValidate(path, value, fieldOpts)
                    } else if (!fieldOpts.optional) return message(path, i18n, "required")
                    return undefined
                },
            })
        },
    }
    return _complex

    function validateChildren(
        path: string[],
        pfields: {
            [name: string]: DocField<any, any> | DocFieldArray<any, any> | ComplexField<any> | OptionsField<any, any>,
        },
        pvalues: any): MessageError {
        let err: MessageError
        pvalues = pvalues || {}
        Object.keys(pfields).some((p) => {
            const f = pfields[p]
            const v = pvalues[p]
            err = (f.fieldType.validate as any)([...path, p], v, f.cfg)
            return !!err
            // if (isComplex(f)) {
            //     err = _validateChildren([path, p, "/"].join(""), f.fieldType.fields, v)
            // } else if (isArray(f)) {
            //     err = f.fieldType.validateArray([path, p, "/"].join(""), f.fieldType.fields, v)
            // } else {
            //     const fv: any = f.fieldType.validate
            //     err = fv(v, f.cfg)
            //     if (err) {
            //         err = [err, " [", path, p, "]"].join("")
            //         return true
            //     }
            // }
            // return false
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
    fieldPath: string[]
    fieldType: OptionsType<OPTIONS>,
    cfg: CFG,
    value: number,
    validate(): MessageError,
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
            fieldPath: undefined as any,
            value: undefined as any,
            fieldType: type,
            cfg,
            validate() {
                return type.validate(f.fieldPath, f.value, f.cfg)
            },
        }
        return f
    }
    function array<CFG extends DefaultFieldOpts>(cfg: DefaultArrayOpts<CFG>): DocFieldArray<number, CFG> {
        const a: DocFieldArray<number, CFG> = {
            fieldName: undefined as any,
            fieldPath: undefined as any,
            cfg,
            value: undefined as any,
            fieldType: {
                typeName: type.typeName + "[]",
                sample: [type.sample],
                validate(path, items) {
                    const l = items && items.length || 0
                    if (l > 0) {
                        if (cfg.minItems && l < cfg.minItems) return message(path, i18n, "minLen", cfg.minItems)
                        if (cfg.maxItems && l > cfg.maxItems) return message(path, i18n, "maxLen", cfg.maxItems)
                        let err: MessageError
                        items.some((i) => {
                            err = type.validate(path, i, cfg.itemOpts)
                            return err !== undefined
                        })
                        if (err) return err
                    } else if (!cfg.optional) return message(path, i18n, "required")
                    return undefined
                },
            },
            itemType: type,
            validate() {
                return a.fieldType.validate(a.fieldPath, a.value, cfg)
            },
        }
        return a
    }
    function validate<CFG extends DefaultFieldOpts>(path: string[], v: number, cfg: CFG): MessageError {
        if (typeof v === "number") {
            if (type.options.some((o) => o.value === v)) return undefined
        }
        if (v === undefined) {
            if (cfg.optional) return undefined
            return message(path, i18n, "required")
        }
        return message(path, i18n, "invalid", v)
    }
}
