
import "tslib"
import { callbackWaiter } from "@hoda5/testutils"
import { mergeableObject, Repository, distribuitedDatabase, testRepository } from "./MergeableObject"

describe("MergeableObject", () => {

    beforeEach(async() => {
        await remoto.resetDB()
    })

    it("MergeableObject", async () => {
        const cb = callbackWaiter()
        const dadoRx = dadoMO.subscribe("/dado/mariaId", cb.callback)
        expect(dadoRx.pending).toBeTruthy()
        expect(await cb.waitCallback()).toBe(dadoRx)
        expect(dadoRx.pending).toBeFalsy()
        expect(dadoRx.theirs.nome).toBe("Maria")
        expect(dadoRx.original.nome).toBe("Maria")
        expect(dadoRx.data.nome).toBe("Maria")
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
