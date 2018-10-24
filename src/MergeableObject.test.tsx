
import "tslib"
import { callbackWaiter } from "@hoda5/testutils"
import { mergeableObject, Repository, distribuitedDatabase, testRepository } from "./MergeableObject"

describe("MergeableObject", () => {

    beforeEach(async () => {
        await remoto.resetDB()
    })

    it("MergeableObject", async () => {
        const cb = callbackWaiter()
        const dadoRx = dadoMO.subscribe({ id: "mariaId".toGuid() }, cb.callback)
        expect(dadoRx.pending).toBeTruthy()
        expect(await cb.waitCallback()).toBe(dadoRx)
        expect(dadoRx.pending).toBeFalsy()
        expect(dadoRx.theirs.nome).toBe("Maria")
        expect(dadoRx.original.nome).toBe("Maria")
        expect(dadoRx.data.nome).toBe("Maria")
        expect(dadoRx.changes).toEqual(false)

        asap(() => dadoRx.data.nome = "Marcia")
        expect(await cb.waitCallback()).toBe(dadoRx)
        expect(dadoRx.theirs.nome).toBe("Maria")
        expect(dadoRx.original.nome).toBe("Maria")
        expect(dadoRx.data.nome).toBe("Marcia")
        const c1 = dadoRx.changes
        expect(c1.nome.conflict).toBeFalsy()
        expect(c1.nome.my).toEqual("Marcia")
        expect(c1.nome.original).toEqual("Maria")
        expect(c1.nome.theirs).toEqual("Maria")

        asap(() => remoto.onPush({ "clientes/mariaId/nome": "Marilia" }))
        expect(await cb.waitCallback()).toBe(dadoRx)
        expect(dadoRx.theirs.nome).toBe("Marilia")
        expect(dadoRx.original.nome).toBe("Maria")
        expect(dadoRx.data.nome).toBe("Marcia")
        const c2 = dadoRx.changes
        expect(c2.nome.conflict).toBeTruthy()
        expect(c2.nome.my).toEqual("Marcia")
        expect(c2.nome.original).toEqual("Maria")
        expect(c2.nome.theirs).toEqual("Marilia")
    })
})

interface Cliente {
    nome: string
    endereco: {
        logradouro: string;
        numero: number;
    }
}

const remoto = testRepository<
    {
        clientes: {
            [clienteId: string]: Cliente,
        },
    }
    >({
        name: "fakeDados",
        db: {
            clientes: {
                mariaId: {
                    nome: "Maria",
                    endereco: {
                        logradouro: "rua 1",
                        numero: 100,
                    },
                },
            },
        },
    })

const dadoMO = mergeableObject<Cliente>().define({
    basePath: [
        () => "clientes",
    ],
    params: {},
    methods: {},
    repositories: [remoto],
})

const dadoDD = distribuitedDatabase({
    dadoMO,
})
