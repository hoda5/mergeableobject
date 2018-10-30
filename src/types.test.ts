import {
    defType, configField, typeByName, complex, configArray,
    stringType, numberType, booleanType, DateISOType, options, message,
} from "./types"
import i18n from "./i18n"

describe("types", () => {
    describe("defType", () => {
        const t = defType<number, {
            min?: number,
        }>({
            typeName: "t",
            sample: -1,
            validate(path, value, opts) {
                if (typeof value === "number") {
                    if (opts.min && value < opts.min) return message(path, tmsgs, "abaixo")
                } else if (!opts.optional) return message(path, i18n, "required")
                return undefined
            },
        })

        it("validate", () => {
            expect(t.sample).toBe(-1)
            expect(t.validate([], undefined as any, {})).toEqual({
                msg: "Obrigatório",
                path: [],
            })
            expect(t.validate([], undefined as any, { optional: true })).toBeUndefined()
            expect(t.validate([], 1, {})).toBeUndefined()
            expect(t.validate([], 1, { optional: true })).toBeUndefined()
            expect(t.validate([], 1, { min: 2, optional: true })).toEqual({
                msg: "Abaixo",
                path: [],
            })
            expect(t.validate([], 1, { min: 2 })).toEqual({
                msg: "Abaixo",
                path: [],
            })
            expect(t.validate([], 2, { min: 2, optional: true })).toBeUndefined()
            expect(t.validate([], 2, { min: 2 })).toBeUndefined()
        })

        it("new field", () => {
            const f = t({ min: 2 })
            let fv: number
            configField(f, {
                fieldPath: ["ft"],
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
            expect(f.validate()).toEqual({
                msg: "Obrigatório",
                path: [],
            })

            fv = 1
            expect(f.value).toBe(1)
            expect(f.validate()).toEqual({
                msg: "Abaixo",
                path: [],
            })

            f.value = 2
            expect(fv).toBe(2)
            expect(f.value).toBe(2)
            expect(f.validate()).toBeUndefined()
        })

        it("single", () => {
            const i = t.single({})
            expect(i.fieldType.typeName).toBe("t")
        })
        it("array", () => {
            const i = t.array({ minItems: 2, itemOpts: {} })
            let arr: number[] = []
            configArray(i, {
                fieldPath: ["i"],
                onGet() {
                    return arr
                },
                onSet(value) {
                    arr = value
                },
            })
            expect(i.fieldName).toBe("i")
            expect(i.fieldType.typeName).toBe("t[]")
            expect(i.itemType.typeName).toBe("t")
            expect(i.value).toBe(arr)
            expect(i.validate()).toEqual({
                msg: "Obrigatório",
                path: ["i"],
            })
            i.value.push(1)
            expect(i.validate()).toEqual({
                msg: "Tamanho mínimo: 2",
                path: ["i"],
            })
            i.value.push(2)
            expect(i.validate()).toBeUndefined()
        })

        it("typeByName", () => {
            expect(typeByName.t).toBe(t)

            expect(() => {
                const t_duplicated = defType<number, {
                    min?: number,
                }>({
                    typeName: "t",
                    sample: 2,
                    validate(path, value, opts) {
                        if (typeof value === "number") {
                            if (opts.min && value < opts.min) return message(path, tmsgs, "abaixo")
                        } else if (!opts.optional) return message(path, i18n, "required")
                        return undefined
                    },
                })
            }).toThrow(/Duplicated typename/g)
        })
    })

    describe("stringType", () => {
        it("single", () => {
            const n = stringType({
                minLen: 2,
                maxLen: 4,
            })
            let nv: string
            configField(n, {
                fieldPath: ["n"],
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
            expect(n.validate()).toEqual({
                msg: "Obrigatório",
                path: [],
            })

            nv = "a"
            expect(n.value).toBe("a")
            expect(n.validate()).toEqual({
                msg: "Tamanho mínimo: 2",
                path: [],
            })

            n.value = "ab"
            expect(nv).toBe("ab")
            expect(n.value).toBe("ab")
            expect(n.validate()).toBeUndefined()
        })

        it("array", () => {
            const i = stringType.array({ maxItems: 1, itemOpts: {} })
            let arr: string[] = []
            configArray(i, {
                fieldPath: ["i"],
                onGet() {
                    return arr
                },
                onSet(value) {
                    arr = value
                },
            })
            expect(i.fieldName).toBe("i")
            expect(i.fieldType.typeName).toBe("string[]")
            expect(i.itemType.typeName).toBe("string")
            expect(i.value).toBe(arr)
            expect(i.validate()).toEqual({
                msg: "Obrigatório",
                path: ["i"],
            })
            i.value.push("a")
            expect(i.validate()).toBeUndefined()
            i.value.push("b")
            expect(i.validate()).toEqual({
                msg: "Tamanho máximo: 1",
                path: ["i"],
            })
        })
    })

    describe("numberType", () => {
        it("single", () => {
            const n = numberType({
                min: 2,
                max: 4,
            })
            let nv: number
            configField(n, {
                fieldPath: ["n"],
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
            expect(n.validate()).toEqual({
                msg: "Obrigatório",
                path: [],
            })

            nv = 1
            expect(n.value).toBe(1)
            expect(n.validate()).toEqual({
                msg: "Mínimo: 2",
                path: [],
            })

            n.value = 2
            expect(nv).toBe(2)
            expect(n.value).toBe(2)
            expect(n.validate()).toBeUndefined()
        })

        it("array", () => {
            const i = numberType.array({ optional: true, maxItems: 1, itemOpts: {} })
            let arr: number[] = []
            configArray(i, {
                fieldPath: ["i"],
                onGet() {
                    return arr
                },
                onSet(value) {
                    arr = value
                },
            })
            expect(i.fieldName).toBe("i")
            expect(i.fieldType.typeName).toBe("number[]")
            expect(i.itemType.typeName).toBe("number")
            expect(i.value).toBe(arr)
            expect(i.validate()).toBeUndefined()
            i.value.push(1)
            expect(i.validate()).toBeUndefined()
            i.value.push(2)
            expect(i.validate()).toEqual({
                msg: "Tamanho máximo: 1",
                path: ["i"],
            })
        })
    })

    describe("booleanType", () => {
        it("single", () => {
            const n = booleanType({})
            let nv: boolean
            configField(n, {
                fieldPath: ["n"],
                onGet() {
                    return nv
                },
                onSet(value) {
                    nv = value
                },
            })
            expect(n.fieldName).toBe("n")
            expect(n.fieldType.typeName).toBe("boolean")

            expect(n.value).toBe(undefined)
            expect(n.validate()).toEqual({
                msg: "Obrigatório",
                path: [],
            })

            nv = false
            expect(n.value).toBeFalsy()
            expect(n.validate()).toBeUndefined()

            n.value = true
            expect(nv).toBeTruthy()
            expect(n.value).toBeTruthy()
            expect(n.validate()).toBeUndefined()
        })

        it("array", () => {
            const i = booleanType.array({ optional: true, maxItems: 1, itemOpts: {} })
            let arr: boolean[] = []
            configArray(i, {
                fieldPath: ["i"],
                onGet() {
                    return arr
                },
                onSet(value) {
                    arr = value
                },
            })
            expect(i.fieldName).toBe("i")
            expect(i.fieldType.typeName).toBe("boolean[]")
            expect(i.itemType.typeName).toBe("boolean")
            expect(i.value).toBe(arr)
            expect(i.validate()).toBeUndefined()
            i.value.push(false)
            expect(i.validate()).toBeUndefined()
            i.value.push(true)
            expect(i.validate()).toEqual({
                msg: "Tamanho máximo: 1",
                path: ["i"],
            })
        })
    })

    describe("dateISOType", () => {
        it("single", () => {
            const n = DateISOType({
                min: "2018-01-01T00:00:00.0Z".toDateISO(),
            })
            let nv: DateISO
            configField(n, {
                fieldPath: ["n"],
                onGet() {
                    return nv
                },
                onSet(value) {
                    nv = value
                },
            })
            expect(n.fieldName).toBe("n")
            expect(n.fieldType.typeName).toBe("DateISO")

            expect(n.value).toBe(undefined)
            expect(n.validate()).toEqual({
                msg: "Obrigatório",
                path: [],
            })

            nv = "2017-01-10T00:00:00.0Z".toDateISO()
            expect(n.value).toBe("2017-01-10T00:00:00.000Z")
            expect(n.validate()).toEqual({
                msg: "Mínimo: 2018-01-01T00:00:00.000Z",
                path: [],
            })

            n.value = "2018-01-01T00:00:00.0Z".toDateISO()
            expect(nv).toBe("2018-01-01T00:00:00.000Z")
            expect(n.value).toBe("2018-01-01T00:00:00.000Z")
            expect(n.validate()).toBeUndefined()
        })

        it("array", () => {
            const i = DateISOType.array({ optional: true, maxItems: 1, itemOpts: {} })
            let arr: DateISO[] = []
            configArray(i, {
                fieldPath: ["i"],
                onGet() {
                    return arr
                },
                onSet(value) {
                    arr = value
                },
            })
            expect(i.fieldName).toBe("i")
            expect(i.fieldType.typeName).toBe("DateISO[]")
            expect(i.itemType.typeName).toBe("DateISO")
            expect(i.value).toBe(arr)
            expect(i.validate()).toBeUndefined()
            i.value.push("2018-01-01T00:00:00.0Z".toDateISO())
            expect(i.validate()).toBeUndefined()
            i.value.push("2017-01-10T00:00:00.0Z".toDateISO())
            expect(i.validate()).toEqual({
                msg: "Tamanho máximo: 1",
                path: ["i"],
            })
        })
    })

    describe("optionsType", () => {
        const _ol = options(
            "_ol",
            {
                op1: {
                    value: 1,
                    text: "Um",
                },
                op2: {
                    value: 2,
                    text: "Dois",
                },
            })

        it("options", () => {

            type TB1 = typeof _ol.op1
            type TB1OK = TB1 extends number ? "OK" : "_ol.op1 devia ser NUMBER"
            const tb1ok: TB1OK = "OK"
            expect(tb1ok).toBe("OK")
            expect(_ol.op1).toBe(1)

            type TB2 = typeof _ol.op2
            type TB2OK = TB2 extends number ? "OK" : "_ol.op2 devia ser NUMBER"
            const tb2ok: TB2OK = "OK"
            expect(tb2ok).toBe("OK")
            expect(_ol.op2).toBe(2)

            expect(_ol.options).toEqual([
                {
                    id: "op1",
                    value: 1,
                    text: "Um",
                },
                {
                    id: "op2",
                    value: 2,
                    text: "Dois",
                },
            ])
            expect(_ol.sample).toEqual(1)
        })

        it("validate", () => {
            expect(_ol.validate(["x"], undefined as any, {})).toEqual({
                msg: "Obrigatório",
                path: ["x"],
            })
            expect(_ol.validate(["x"], undefined as any, { optional: false })).toEqual({
                msg: "Obrigatório",
                path: ["x"],
            })
            expect(_ol.validate(["x"], _ol.op1, {})).toBeUndefined()
            expect(_ol.validate(["x"], _ol.op2, {})).toBeUndefined()
        })

        it("new field", () => {
            const f = _ol({})
            let fv: typeof _ol.sample
            configField(f, {
                fieldPath: ["f"],
                onGet() {
                    return fv
                },
                onSet(value) {
                    fv = value
                },
            })
            expect(f.fieldName).toBe("f")
            expect(f.fieldType.typeName).toBe("_ol")

            expect(f.value).toBe(undefined)
            expect(f.validate()).toEqual({
                msg: "Obrigatório",
                path: ["f"],
            })

            fv = 3
            expect(f.value).toEqual(3)
            expect(f.validate()).toEqual({
                msg: "Inválido (3)",
                path: ["f"],
            })

            f.value = _ol.op1
            expect(fv).toEqual(1)
            expect(f.value).toEqual(1)
            expect(f.validate()).toBeUndefined()
        })

        it("array", () => {
            const i = _ol.array({ optional: true, maxItems: 1, itemOpts: {} })
            let arr: Array<typeof _ol.sample> = []
            configArray(i, {
                fieldPath: ["i"],
                onGet() {
                    return arr
                },
                onSet(value) {
                    arr = value
                },
            })
            expect(i.fieldName).toBe("i")
            expect(i.fieldType.typeName).toBe("_ol[]")
            expect(i.itemType.typeName).toBe("_ol")
            expect(i.value).toBe(arr)
            expect(i.validate()).toBeUndefined()
            i.value.push(3)
            expect(i.validate()).toEqual({
                msg: "Inválido (3)",
                path: ["i"],
            })
            i.value.pop()
            i.value.push(1)
            expect(i.validate()).toBeUndefined()
            i.value.push(2)
            debugger
            expect(i.validate()).toEqual({
                msg: "Tamanho máximo: 1",
                path: ["i"],
            })
        })
    })

    describe("complexType", () => {
        describe("one level", () => {
            const _ol = complex({
                a: numberType({ min: 2 }),
                b: numberType({}),
            })

            it("complex", () => {
                expect(_ol.fieldType.fields.a.fieldType.typeName).toBe("number")
                expect(_ol.fieldType.fields.b.fieldType.typeName).toBe("number")
                expect(_ol.fieldType.sample).toEqual({ a: 0, b: 0 })
            })

            const _complexType = _ol.defType<{ exige3: boolean }>({
                typeName: "_ol",
                validate(path, value, opts) {
                    if (value && value.a && value.b) {
                        if (opts.exige3 && (value.a + value.b !== 3)) return message(path, tmsgs, "s3")
                    }
                    return undefined
                },
            })

            it("validate", () => {
                expect(_complexType.validate([], undefined as any, { exige3: false })).toEqual({
                    msg: "Obrigatório",
                    path: [],
                })
                debugger
                expect(_complexType.validate([], { a: 2 } as any, { exige3: false })).toEqual({
                    msg: "Obrigatório",
                    path: ["b"],
                })
                expect(_complexType.validate([], { b: 1 } as any, { exige3: false })).toEqual({
                    msg: "Obrigatório",
                    path: ["a"],
                })
                expect(_complexType.validate([], { a: 1, b: 2 } as any, { exige3: false })).toEqual({
                    msg: "Mínimo: 2",
                    path: ["a"],
                })
                expect(_complexType.validate([], undefined as any, { exige3: false, optional: true })).toBeUndefined()
                expect(_complexType.validate([], { a: 5, b: 2 }, { exige3: false })).toBeUndefined()
                expect(_complexType.validate([], { a: 5, b: 2 }, { exige3: true })).toEqual({
                    msg: "soma deve ser 3",
                    path: [],
                })
                expect(_complexType.validate([], { a: 5, b: -2 }, { exige3: true })).toBeUndefined()
            })

            it("new field", () => {
                const cf = _complexType({ exige3: true })
                let fv: typeof _complexType.sample
                configField(cf, {
                    fieldPath: ["cf"],
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
                expect(cf.validate()).toEqual({
                    msg: "Obrigatório",
                    path: [],
                })

                fv = { a: 7, b: 4 }
                expect(cf.value).toEqual({ a: 7, b: 4 })
                expect(cf.validate()).toEqual({
                    msg: "soma deve ser 3",
                    path: [],
                })

                cf.value = { a: 7, b: -4 }
                expect(fv).toEqual({ a: 7, b: -4 })
                expect(cf.value).toEqual({ a: 7, b: -4 })
                expect(cf.validate()).toBeUndefined()
            })

            it("array", () => {
                const i = _complexType.array({ optional: true, maxItems: 1, itemOpts: { exige3: true } })
                let arr: Array<typeof _complexType.sample> = []
                configArray(i, {
                    fieldPath: ["i"],
                    onGet() {
                        return arr
                    },
                    onSet(value) {
                        arr = value
                    },
                })
                expect(i.fieldName).toBe("i")
                expect(i.fieldType.typeName).toBe("_ol[]")
                expect(i.itemType.typeName).toBe("_ol")
                expect(i.value).toBe(arr)
                expect(i.validate()).toBeUndefined()
                i.value.push({ a: 2, b: 5 })
                expect(i.validate()).toEqual({
                    msg: "soma deve ser 3",
                    path: ["i", "0"],
                })
                i.value.pop()
                i.value.push({ a: 2, b: 1 })
                expect(i.validate()).toBeUndefined()
                i.value.push({ a: -2, b: 5 })
                expect(i.validate()).toEqual({
                    msg: "Tamanho máximo: 1",
                    path: ["i"],
                })
            })
        })

        describe("many levels", () => {
            const _ml = complex({
                a: numberType({}),
                l1: complex({
                    l2: complex({
                        b: numberType({ min: 1 }),
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
                validate(path, value, opts) {
                    if (value && value.a && value.l1 && value.l1.l2 && value.l1.l2.b) {
                        if (opts.exige3 && (value.a + value.l1.l2.b !== 3)) return message(path, tmsgs, "s3")
                    }
                    return undefined
                },
            })

            it("validate", () => {
                expect(_complexType.validate([], undefined as any, { exige3: false })).toEqual({
                    msg: "Obrigatório",
                    path: [],
                })
                expect(_complexType.validate([], { a: 1 } as any, { exige3: false })).toEqual({
                    msg: "Obrigatório",
                    path: ["l1", "l2", "b"],
                })
                expect(_complexType.validate([], { l1: { l2: { b: 2 } } } as any, { exige3: true }))
                    .toEqual({
                        msg: "Obrigatório",
                        path: ["a"],
                    })
                expect(_complexType.validate([], { a: 1, l1: { l2: { b: 0 } } } as any,
                    { exige3: false })).toEqual({
                        msg: "Mínimo: 1",
                        path: ["l1", "l2", "b"],
                    })
                expect(_complexType.validate([], undefined as any, { exige3: false, optional: true }))
                    .toBeUndefined()
                expect(_complexType.validate([], { a: 5, l1: { l2: { b: 2 } } }, { exige3: false })).toBeUndefined()
                expect(_complexType.validate([], { a: 5, l1: { l2: { b: 2 } } }, { exige3: true }))
                    .toEqual({
                        msg: "soma deve ser 3",
                        path: [],
                    })
                expect(_complexType.validate([], { a: 5, l1: { l2: { b: -2 } } }, { exige3: true }))
                    .toEqual({
                        msg: "Mínimo: 1",
                        path: ["l1", "l2", "b"],
                    })

                expect(_complexType.validate([], { a: 1, l1: { l2: { b: 2 } } }, { exige3: true })).toBeUndefined()
            })

            it("new field", () => {
                const cf = _complexType({ exige3: true })
                let fv: typeof _complexType.sample
                configField(cf, {
                    fieldPath: ["cf"],
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
                expect(cf.validate()).toEqual({
                    msg: "Obrigatório",
                    path: [],
                })

                fv = { a: 7, l1: { l2: { b: 4 } } }
                expect(cf.value).toEqual({ a: 7, l1: { l2: { b: 4 } } })
                expect(cf.validate()).toEqual({
                    msg: "soma deve ser 3",
                    path: [],
                })

                cf.value = { a: 7, l1: { l2: { b: -4 } } }
                expect(fv).toEqual({ a: 7, l1: { l2: { b: -4 } } })
                expect(cf.value).toEqual({ a: 7, l1: { l2: { b: -4 } } })
                expect(cf.validate()).toEqual({
                    msg: "Mínimo: 1",
                    path: ["l1", "l2", "b"],
                })

                cf.value = { a: 2, l1: { l2: { b: 1 } } }
                expect(fv).toEqual({ a: 2, l1: { l2: { b: 1 } } })
                expect(cf.value).toEqual({ a: 2, l1: { l2: { b: 1 } } })
                expect(cf.validate()).toBeUndefined()
            })

            it("array", () => {
                const i = _complexType.array({ optional: true, maxItems: 1, itemOpts: { exige3: true } })
                let arr: Array<typeof _complexType.sample> = []
                configArray(i, {
                    fieldPath: ["i"],
                    onGet() {
                        return arr
                    },
                    onSet(value) {
                        arr = value
                    },
                })
                expect(i.fieldName).toBe("i")
                expect(i.fieldType.typeName).toBe("_ml[]")
                expect(i.itemType.typeName).toBe("_ml")
                expect(i.value).toBe(arr)
                debugger
                expect(i.validate()).toBeUndefined()
                i.value.push({ a: 2, l1: { l2: { b: 5 } } })
                expect(i.validate()).toEqual({
                    msg: "soma deve ser 3",
                    path: ["i", "0"],
                })
                i.value.pop()
                i.value.push({ a: -2, l1: { l2: { b: 5 } } })
                expect(i.validate()).toBeUndefined()
                i.value.push({ a: -2, l1: { l2: { b: 5 } } })
                expect(i.validate()).toEqual({
                    msg: "Tamanho máximo: 1",
                    path: ["i"],
                })
            })
        })
    })
})

export const tmsgs = {
    abaixo: "Abaixo",
    s3: "soma deve ser 3",
}
