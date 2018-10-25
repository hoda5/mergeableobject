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
    T extends DocField<infer TYPE, infer OPTS> ? TYPE :
    T extends ComplexDef<infer COMPLEX> ? {
        [name in keyof COMPLEX]: PureField<COMPLEX[name]>
    } :
    T extends DocFields ? {
        [name in keyof T]: PureField<T[name]>
    }
    : unknown

export interface DocFields {
    [name: string]: DocField<any, any> | ComplexDef<any>
}

interface DocField<T, OPTS> {
    fieldName: string
    fieldType: DocFieldType<T, OPTS>
    value: T,
    validate(): string | null,
}

// interface DocFieldComplex<FIELDS extends DocFields> extends DocField<PureField<FIELDS>> {
//     fields: FIELDS,
// }

interface DocFieldType<T, OPTS extends DefaultFieldOpts> {
    typeName: string,
    sample: T,
    validate(v: T, opts: OPTS): string | null,
}

export interface DefaultFieldOpts {
    optional?: boolean
    hint?: string
}

export const typeByName: { [name: string]: DocFieldType<any, any> } = {}

export function defType<T, OPTS>(typeOpts: {
    typeName: string,
    sample: T,
    validate(value: T, opts: OPTS & DefaultFieldOpts): string | null,
}): DocFieldType<T, OPTS & DefaultFieldOpts>
    & ((opts: OPTS & DefaultFieldOpts) => DocField<T, OPTS & DefaultFieldOpts>) {
    const { typeName, sample, validate } = typeOpts
    if (typeByName[typeName]) throw new Error("Duplicated typename " + typeName)
    const tp: DocFieldType<T, OPTS & DefaultFieldOpts> = {
        typeName,
        sample,
        validate,
    }
    const type = tp.mergeObjWith((fieldOpts: OPTS & DefaultFieldOpts) => {
        const field: DocField<T, OPTS & DefaultFieldOpts> = {
            fieldName: undefined as any,
            value: undefined as any,
            fieldType: type,
            validate() {
                return type.validate(field.value, fieldOpts)
            },
        }
        return field
    })
    typeByName[typeName] = type
    return type
}

export function configField<T, OPTS>(field: DocField<T, OPTS>, opts: {
    name: string,
    onGet(): T,
    onSet(value: T): void,
}) {
    Object.defineProperties(field, {
        fieldName: { value: opts.name },
        value: {
            get: opts.onGet,
            set: opts.onSet,
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
    validate(value, opts) {
        if (typeof value === "string") {
            if (opts.minLen && value.length < opts.minLen) return "Tamanho mínimo: " + opts.minLen
            if (opts.maxLen && value.length > opts.maxLen) return "Tamanho máximo: " + opts.maxLen
        } else if (value) return "Tipo do dado inválido (" + typeof value + ")"
        else return "Obrigatório"
        return null
    },
})

export const numberType = defType<number, {
    min?: number,
    max?: number,
}>({
    typeName: "number",
    sample: 0,
    validate(value, opts) {
        if (typeof value === "number") {
            if (opts.min && value < opts.min) return "Mínimo: " + opts.min
            if (opts.max && value > opts.max) return "Máximo: " + opts.max
        } else if (value) return "Tipo do dado inválido (" + typeof value + ")"
        else return "Obrigatório"
        return null
    },
})

export interface ComplexDef<FIELDS> {
    fieldType: {
        fields: FIELDS,
        sample: PureField<FIELDS>,
    },
    defType<OPTS>(typeOpts: {
        typeName: string,
        validate?(value: PureField<FIELDS>, opts: OPTS & DefaultFieldOpts): string | null,
    }): DocFieldType<PureField<FIELDS>, OPTS & DefaultFieldOpts>
        & ((opts: OPTS & DefaultFieldOpts) => DocField<PureField<FIELDS>, OPTS & DefaultFieldOpts>)
}

export function complex<FIELDS extends DocFields>(fields: FIELDS): ComplexDef<FIELDS> {
    const sample = makeDefault()
    return {
        fieldType: {
            fields,
            sample,
        },
        defType<OPTS>(typeOpts: {
            typeName: string,
            validate?(value: PureField<FIELDS>, opts: OPTS & DefaultFieldOpts): string | null,
        }): DocFieldType<PureField<FIELDS>, OPTS & DefaultFieldOpts>
            & ((opts: OPTS & DefaultFieldOpts) => DocField<PureField<FIELDS>, OPTS & DefaultFieldOpts>) {

            const v = typeOpts.validate ? typeOpts.validate :
                (value: PureField<FIELDS>, fieldOpts: DefaultFieldOpts) => {
                    if (!(value || fieldOpts.optional)) return "Obrigatório"
                    return null
                }
            return defType<PureField<FIELDS>, OPTS>({ ...typeOpts, validate: v, sample })
        },
    }
    function makeDefault() {
        const r: PureField<FIELDS> = {} as any
        Object.keys(fields).forEach((p) => {
            r[p] = fields[p].fieldType.sample
        })
        return r
    }
}

// export const numberType: DocFieldType<number> = null as any

// const Cli = defDoc({
//     name: "cli",
//     fields: {
//         nome: new strType()
//     }
// })

// const _fields = Cli.fields
// _fields.nome.value = "1"
