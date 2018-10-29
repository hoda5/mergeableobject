import {
    defType, configField, typeByName, complex, configArray,
    stringType, numberType, booleanType, DateISOType, options,
} from "./types"

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
                return undefined
            },
        })

        it("validate", () => {
            expect(t.sample).toBe(-1)
            expect(t.validate(undefined as any, {})).toBe("requerido")
            expect(t.validate(undefined as any, { optional: true })).toBeUndefined()
            expect(t.validate(1, {})).toBeUndefined()
            expect(t.validate(1, { optional: true })).toBeUndefined()
            expect(t.validate(1, { min: 2, optional: true })).toBe("abaixo")
            expect(t.validate(1, { min: 2 })).toBe("abaixo")
            expect(t.validate(2, { min: 2, optional: true })).toBeUndefined()
            expect(t.validate(2, { min: 2 })).toBeUndefined()
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
                name: "i",
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
            expect(i.validate()).toBe("Obrigatório")
            i.value.push(1)
            expect(i.validate()).toBe("Mínimo: 2")
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
                    validate(value, opts) {
                        if (typeof value === "number") {
                            if (opts.min && value < opts.min) return "abaixo"
                        } else if (!opts.optional) return "requerido"
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
            expect(n.validate()).toBeUndefined()
        })

        it("array", () => {
            const i = stringType.array({ maxItems: 1, itemOpts: {} })
            let arr: string[] = []
            configArray(i, {
                name: "i",
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
            expect(i.validate()).toBe("Obrigatório")
            i.value.push("a")
            expect(i.validate()).toBeUndefined()
            i.value.push("b")
            expect(i.validate()).toBe("Máximo: 1")
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
            expect(n.validate()).toBeUndefined()
        })

        it("array", () => {
            const i = numberType.array({ optional: true, maxItems: 1, itemOpts: {} })
            let arr: number[] = []
            configArray(i, {
                name: "i",
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
            expect(i.validate()).toBe("Máximo: 1")
        })
    })

    describe("booleanType", () => {
        it("single", () => {
            const n = booleanType({})
            let nv: boolean
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
            expect(n.fieldType.typeName).toBe("boolean")

            expect(n.value).toBe(undefined)
            expect(n.validate()).toBe("Obrigatório")

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
                name: "i",
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
            expect(i.validate()).toBe("Máximo: 1")
        })
    })

    describe("dateISOType", () => {
        it("single", () => {
            const n = DateISOType({
                min: "2018-01-01T00:00:00.0Z".toDateISO(),
            })
            let nv: DateISO
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
            expect(n.fieldType.typeName).toBe("DateISO")

            expect(n.value).toBe(undefined)
            expect(n.validate()).toBe("Obrigatório")

            nv = "2017-01-10T00:00:00.0Z".toDateISO()
            expect(n.value).toBe("2017-01-10T00:00:00.000Z")
            expect(n.validate()).toBe("Mínimo: 2018-01-01T00:00:00.000Z")

            n.value = "2018-01-01T00:00:00.0Z".toDateISO()
            expect(nv).toBe("2018-01-01T00:00:00.000Z")
            expect(n.value).toBe("2018-01-01T00:00:00.000Z")
            expect(n.validate()).toBeUndefined()
        })

        it("array", () => {
            const i = DateISOType.array({ optional: true, maxItems: 1, itemOpts: {} })
            let arr: DateISO[] = []
            configArray(i, {
                name: "i",
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
            expect(i.validate()).toBe("Máximo: 1")
        })
    })

    describe("enumType", () => {
        const _ol = options({
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
                    text: "um",
                },
                {
                    id: "op2",
                    value: 2,
                    text: "dois",
                },
            ])
            expect(_ol.sample).toEqual(1)
        })

        it("validate", () => {
            expect(_ol.validate(undefined as any, {})).toBe("Obrigatório")
            expect(_ol.validate(undefined as any, { optional: false })).toBe("Obrigatório")
            expect(_ol.validate(_ol.op1, {})).toBe("Obrigatório")
            expect(_ol.validate(_ol.op2, {})).toBe("Obrigatório")
        })

        it("new field", () => {
            const f = _ol({})
            let fv: typeof _ol.sample
            configField(f, {
                name: "f",
                onGet() {
                    return fv
                },
                onSet(value) {
                    fv = value
                },
            })
            expect(f.fieldName).toBe("cf")
            expect(f.fieldType.typeName).toBe("_ol")

            expect(f.value).toBe(undefined)
            expect(f.validate()).toBe("Obrigatório")

            fv = 3
            expect(f.value).toEqual(3)
            expect(f.validate()).toBe("soma deve ser 3")

            f.value = _ol.op1
            expect(fv).toEqual(1)
            expect(f.value).toEqual(1)
            expect(f.validate()).toBeUndefined()
        })

        it("array", () => {
            const i = _ol.array({ optional: true, maxItems: 1, itemOpts: {} })
            let arr: Array<typeof _ol.sample> = []
            configArray(i, {
                name: "i",
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
            expect(i.validate()).toBe("soma deve ser 3")
            i.value.pop()
            i.value.push(1)
            expect(i.validate()).toBeUndefined()
            i.value.push(2)
            expect(i.validate()).toBe("Máximo: 1")
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
                validate(value, opts) {
                    if (value && value.a && value.b) {
                        if (opts.exige3 && (value.a + value.b !== 3)) return "soma deve ser 3"
                    }
                    return undefined
                },
            })

            it("validate", () => {
                expect(_complexType.validate(undefined as any, { exige3: false })).toBe("Obrigatório")
                expect(_complexType.validate({ a: 2 } as any, { exige3: false })).toBe("Obrigatório [b]")
                expect(_complexType.validate({ b: 1 } as any, { exige3: false })).toBe("Obrigatório [a]")
                expect(_complexType.validate({ a: 1, b: 2 } as any, { exige3: false })).toBe("Mínimo: 2 [a]")
                expect(_complexType.validate(undefined as any, { exige3: false, optional: true })).toBeUndefined()
                expect(_complexType.validate({ a: 5, b: 2 }, { exige3: false })).toBeUndefined()
                expect(_complexType.validate({ a: 5, b: 2 }, { exige3: true })).toBe("soma deve ser 3")
                expect(_complexType.validate({ a: 5, b: -2 }, { exige3: true })).toBeUndefined()
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
                expect(cf.validate()).toBe("Obrigatório")

                fv = { a: 7, b: 4 }
                expect(cf.value).toEqual({ a: 7, b: 4 })
                expect(cf.validate()).toBe("soma deve ser 3")

                cf.value = { a: 7, b: -4 }
                expect(fv).toEqual({ a: 7, b: -4 })
                expect(cf.value).toEqual({ a: 7, b: -4 })
                expect(cf.validate()).toBeUndefined()
            })

            it("array", () => {
                const i = _complexType.array({ optional: true, maxItems: 1, itemOpts: { exige3: true } })
                let arr: Array<typeof _complexType.sample> = []
                configArray(i, {
                    name: "i",
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
                expect(i.validate()).toBe("soma deve ser 3")
                i.value.pop()
                i.value.push({ a: 2, b: 1 })
                expect(i.validate()).toBeUndefined()
                i.value.push({ a: -2, b: 5 })
                expect(i.validate()).toBe("Máximo: 1")
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
                validate(value, opts) {
                    if (value && value.a && value.l1 && value.l1.l2 && value.l1.l2.b) {
                        if (opts.exige3 && (value.a + value.l1.l2.b !== 3)) return "soma deve ser 3"
                    }
                    return undefined
                },
            })

            it("validate", () => {
                expect(_complexType.validate(undefined as any, { exige3: false })).toBe("Obrigatório")
                expect(_complexType.validate({ a: 1 } as any, { exige3: false })).toBe("Obrigatório [l1/l2/b]")
                expect(_complexType.validate({ l1: { l2: { b: 2 } } } as any, { exige3: true })).toBe("Obrigatório [a]")
                expect(_complexType.validate({ a: 1, l1: { l2: { b: 0 } } } as any,
                    { exige3: false })).toBe("Mínimo: 1 [l1/l2/b]")
                expect(_complexType.validate(undefined as any, { exige3: false, optional: true })).toBeUndefined()
                expect(_complexType.validate({ a: 5, l1: { l2: { b: 2 } } }, { exige3: false })).toBeUndefined()
                expect(_complexType.validate({ a: 5, l1: { l2: { b: 2 } } }, { exige3: true })).toBe("soma deve ser 3")
                expect(_complexType.validate({ a: 5, l1: { l2: { b: -2 } } }, { exige3: true }))
                    .toBe("Mínimo: 1 [l1/l2/b]")
                expect(_complexType.validate({ a: 1, l1: { l2: { b: 2 } } }, { exige3: true })).toBeUndefined()
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
                expect(cf.validate()).toBe("Obrigatório")

                fv = { a: 7, l1: { l2: { b: 4 } } }
                expect(cf.value).toEqual({ a: 7, l1: { l2: { b: 4 } } })
                expect(cf.validate()).toBe("soma deve ser 3")

                cf.value = { a: 7, l1: { l2: { b: -4 } } }
                expect(fv).toEqual({ a: 7, l1: { l2: { b: -4 } } })
                expect(cf.value).toEqual({ a: 7, l1: { l2: { b: -4 } } })
                expect(cf.validate()).toBe("Mínimo: 1 [l1/l2/b]")

                cf.value = { a: 2, l1: { l2: { b: 1 } } }
                expect(fv).toEqual({ a: 2, l1: { l2: { b: 1 } } })
                expect(cf.value).toEqual({ a: 2, l1: { l2: { b: 1 } } })
                expect(cf.validate()).toBeUndefined()
            })

            it("array", () => {
                const i = _complexType.array({ optional: true, maxItems: 1, itemOpts: { exige3: true } })
                let arr: Array<typeof _complexType.sample> = []
                configArray(i, {
                    name: "i",
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
                expect(i.validate()).toBeUndefined()
                i.value.push({ a: 2, l1: { l2: { b: 5 } } })
                expect(i.validate()).toBe("soma deve ser 3")
                i.value.pop()
                i.value.push({ a: -2, l1: { l2: { b: 5 } } })
                expect(i.validate()).toBeUndefined()
                i.value.push({ a: -2, l1: { l2: { b: 5 } } })
                expect(i.validate()).toBe("Máximo: 1")
            })
        })
    })
})
