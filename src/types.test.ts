import { defType, configField, typeByName, stringType, numberType, complex } from "./types"

describe("types", () => {
    describe("defType", () => {
        const t = defType<number, {
            min?: number,
        }>({
            typeName: "t",
            sample: -1,
            validate(value, opts) {
                if (typeof value === "number") {
                    if (opts.min && value < opts.min) return "abaixo"
                } else if (!opts.optional) return "requerido"
                return null
            },
        })

        it("validate", () => {
            expect(t.sample).toBe(-1)
            expect(t.validate(undefined as any, {})).toBe("requerido")
            expect(t.validate(undefined as any, { optional: true })).toBeNull()
            expect(t.validate(1, {})).toBeNull()
            expect(t.validate(1, { optional: true })).toBeNull()
            expect(t.validate(1, { min: 2, optional: true })).toBe("abaixo")
            expect(t.validate(1, { min: 2 })).toBe("abaixo")
            expect(t.validate(2, { min: 2, optional: true })).toBeNull()
            expect(t.validate(2, { min: 2 })).toBeNull()
        })

        it("new field", () => {
            const f = t({ min: 2 })
            let fv: number
            configField(f, {
                name: "ft",
                onGet() {
                    return fv
                },
                onSet(value) {
                    fv = value
                },
            })
            expect(f.fieldName).toBe("ft")
            expect(f.fieldType.typeName).toBe("t")

            expect(f.value).toBe(undefined)
            expect(f.validate()).toBe("requerido")

            fv = 1
            expect(f.value).toBe(1)
            expect(f.validate()).toBe("abaixo")

            f.value = 2
            expect(fv).toBe(2)
            expect(f.value).toBe(2)
            expect(f.validate()).toBeNull()
        })

        it("typeByName", () => {
            expect(typeByName.t).toBe(t)

            expect(() => {
                const t_duplicated = defType<number, {
                    min?: number,
                }>({
                    typeName: "t",
                    sample: 2,
                    validate(value, opts) {
                        if (typeof value === "number") {
                            if (opts.min && value < opts.min) return "abaixo"
                        } else if (!opts.optional) return "requerido"
                        return null
                    },
                })
            }).toThrow(/Duplicated typename/g)
        })
    })
    describe("internal types", () => {
        it("stringType", () => {
            const n = stringType({
                minLen: 2,
                maxLen: 4,
            })
            let nv: string
            configField(n, {
                name: "n",
                onGet() {
                    return nv
                },
                onSet(value: string) {
                    nv = value
                },
            })
            expect(n.fieldName).toBe("n")
            expect(n.fieldType.typeName).toBe("string")

            expect(n.value).toBe(undefined)
            expect(n.validate()).toBe("Obrigatório")

            nv = "a"
            expect(n.value).toBe("a")
            expect(n.validate()).toBe("Tamanho mínimo: 2")

            n.value = "ab"
            expect(nv).toBe("ab")
            expect(n.value).toBe("ab")
            expect(n.validate()).toBeNull()
        })
        it("numberType", () => {
            const n = numberType({
                min: 2,
                max: 4,
            })
            let nv: number
            configField(n, {
                name: "n",
                onGet() {
                    return nv
                },
                onSet(value) {
                    nv = value
                },
            })
            expect(n.fieldName).toBe("n")
            expect(n.fieldType.typeName).toBe("number")

            expect(n.value).toBe(undefined)
            expect(n.validate()).toBe("Obrigatório")

            nv = 1
            expect(n.value).toBe(1)
            expect(n.validate()).toBe("Mínimo: 2")

            n.value = 2
            expect(nv).toBe(2)
            expect(n.value).toBe(2)
            expect(n.validate()).toBeNull()
        })
    })

    describe("complexType", () => {
        describe("one level", () => {
            const _ol = complex({
                a: numberType({}),
                b: numberType({}),
            })

            it("complex", () => {
                expect(_ol.fieldType.fields.a.fieldType.typeName).toBe("number")
                expect(_ol.fieldType.fields.b.fieldType.typeName).toBe("number")
                expect(_ol.fieldType.sample).toEqual({ a: 0, b: 0 })
            })

            const _complexType = _ol.defType<{ exige3: boolean }>({
                typeName: "_ol",
                validate(value, opts) {
                    if (value && value.a && value.b) {
                        if (opts.exige3 && (value.a + value.b !== 3)) return "soma deve ser 3"
                    } else if (!opts.optional) return "requerido"
                    return null
                },
            })

            it("validate", () => {
                expect(_complexType.validate(undefined as any, { exige3: false })).toBe("requerido")
                expect(_complexType.validate({ a: 1 } as any, { exige3: false })).toBe("requerido")
                expect(_complexType.validate({ b: 1 } as any, { exige3: false })).toBe("requerido")
                expect(_complexType.validate(undefined as any, { exige3: false, optional: true })).toBeNull()
                expect(_complexType.validate({ a: 5, b: 2 }, { exige3: false })).toBeNull()
                expect(_complexType.validate({ a: 5, b: 2 }, { exige3: true })).toBe("soma deve ser 3")
                expect(_complexType.validate({ a: 5, b: -2 }, { exige3: true })).toBeNull()
            })

            it("new field", () => {
                const cf = _complexType({ exige3: true })
                let fv: typeof _complexType.sample
                configField(cf, {
                    name: "cf",
                    onGet() {
                        return fv
                    },
                    onSet(value) {
                        fv = value
                    },
                })
                expect(cf.fieldName).toBe("cf")
                expect(cf.fieldType.typeName).toBe("_ol")

                expect(cf.value).toBe(undefined)
                expect(cf.validate()).toBe("requerido")

                fv = { a: 7, b: 4 }
                expect(cf.value).toEqual({ a: 7, b: 4 })
                expect(cf.validate()).toBe("soma deve ser 3")

                cf.value = { a: 7, b: -4 }
                expect(fv).toEqual({ a: 7, b: -4 })
                expect(cf.value).toEqual({ a: 7, b: -4 })
                expect(cf.validate()).toBeNull()
            })
        })

        describe("many levels", () => {
            const _ml = complex({
                a: numberType({}),
                l1: complex({
                    l2: complex({
                        b: numberType({}),
                    }),
                }),
            })

            it("complex", () => {
                expect(_ml.fieldType.fields.a.fieldType.typeName).toBe("number")
                expect(_ml.fieldType.fields.l1.fieldType.fields.l2.fieldType.fields.b.fieldType.typeName).toBe("number")
                expect(_ml.fieldType.sample).toEqual({ a: 0, l1: { l2: { b: 0 } } })
                type TB = typeof _ml.fieldType.sample.l1.l2.b
                type TBOK = TB extends number ? "OK" : "B devia ser NUMBER"
                const tbok: TBOK = "OK"
                expect(tbok).toBe("OK")
            })

            const _complexType = _ml.defType<{ exige3: boolean }>({
                typeName: "_ml",
                validate(value, opts) {
                    if (value && value.a && value.l1 && value.l1.l2 && value.l1.l2.b) {
                        if (opts.exige3 && (value.a + value.l1.l2.b !== 3)) return "soma deve ser 3"
                    } else if (!opts.optional) return "requerido"
                    return null
                },
            })

            it("validate", () => {
                expect(_complexType.validate(undefined as any, { exige3: false })).toBe("requerido")
                expect(_complexType.validate({ a: 1 } as any, { exige3: false })).toBe("requerido")
                expect(_complexType.validate({ b: 1 } as any, { exige3: false })).toBe("requerido")
                expect(_complexType.validate(undefined as any, { exige3: false, optional: true })).toBeNull()
                expect(_complexType.validate({ a: 5, l1: { l2: { b: 2 } } }, { exige3: false })).toBeNull()
                expect(_complexType.validate({ a: 5, l1: { l2: { b: 2 } } }, { exige3: true })).toBe("soma deve ser 3")
                expect(_complexType.validate({ a: 5, l1: { l2: { b: -2 } } }, { exige3: true })).toBeNull()
            })

            it("new field", () => {
                const cf = _complexType({ exige3: true })
                let fv: typeof _complexType.sample
                configField(cf, {
                    name: "cf",
                    onGet() {
                        return fv
                    },
                    onSet(value) {
                        fv = value
                    },
                })
                expect(cf.fieldName).toBe("cf")
                expect(cf.fieldType.typeName).toBe("_ml")

                expect(cf.value).toBe(undefined)
                expect(cf.validate()).toBe("requerido")

                fv = { a: 7, l1: { l2: { b: 4 } } }
                expect(cf.value).toEqual({ a: 7, l1: { l2: { b: 4 } } })
                expect(cf.validate()).toBe("soma deve ser 3")

                cf.value = { a: 7, l1: { l2: { b: -4 } } }
                expect(fv).toEqual({ a: 7, l1: { l2: { b: -4 } } })
                expect(cf.value).toEqual({ a: 7, l1: { l2: { b: -4 } } })
                expect(cf.validate()).toBeNull()
            })
        })
    })
})
/*

export function defDoc<FIELDS extends DocFields>
    (dd: DocDecl<FIELDS>): DocDef<FIELDS> {
    return null as any
}

export function complexType<FIELDS extends DocFields>
    (fields: FIELDS): DocFieldComplex<FIELDS> {
    return null as any
}
export const stringType: DocFieldType<string> = null as any
export const numberType: DocFieldType<number> = null as any

// const Cli = defDoc({
//     name: "cli",
//     fields: {
//         nome: new strType()
//     }
// })

// const _fields = Cli.fields
// _fields.nome.value = "1"

*/
