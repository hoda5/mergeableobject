
import "tslib"
import { callbackWaiter } from "@hoda5/testutils"
import { mergeableObject, Repository, distribuitedDatabase, testRepository } from "./MergeableObject"
// import { defDoc, stringType, numberType, complexType } from "./types"

describe.skip("MergeableObject", () => {

    // beforeEach(async () => {
    //     await remoto.resetDB()
    // })

    // it("MergeableObject", async () => {
    //     const cb = callbackWaiter()
    //     const m = dadoMO.subscribe({ id: "mariaId".toGuid() }, cb.callback)
    //     expect(m.pending).toBeTruthy()
    //     expect(await cb.waitCallback()).toBe(m)
    //     expect(m.pending).toBeFalsy()
    //     expect(m.theirs.nome).toBe("Maria")
    //     expect(m.original.nome).toBe("Maria")
    //     expect(m.my.nome).toBe("Maria")
    //     expect(m.changes).toEqual(false)

    //     asap(() => m.my.nome = "Marcia")
    //     expect(await cb.waitCallback()).toBe(m)
    //     expect(m.theirs.nome).toBe("Maria")
    //     expect(m.original.nome).toBe("Maria")
    //     expect(m.my.nome).toBe("Marcia")
    //     const c1 = m.changes
    //     expect(c1.nome.conflict).toBeFalsy()
    //     expect(c1.nome.my).toEqual("Marcia")
    //     expect(c1.nome.original).toEqual("Maria")
    //     expect(c1.nome.theirs).toEqual("Maria")

    //     asap(() => remoto.onPush({ "clientes/mariaId/nome": "Marilia" }))
    //     expect(await cb.waitCallback()).toBe(m)
    //     expect(m.theirs.nome).toBe("Marilia")
    //     expect(m.original.nome).toBe("Maria")
    //     expect(m.my.nome).toBe("Marcia")
    //     const c2 = m.changes
    //     expect(c2.nome.conflict).toBeTruthy()
    //     expect(c2.nome.my).toEqual("Marcia")
    //     expect(c2.nome.original).toEqual("Maria")
    //     expect(c2.nome.theirs).toEqual("Marilia")
    // })
})

// const defCliente = defDoc({
//     name: "Clientes",
//     fields: {
//         nome: stringType(),
//         endereco: complexType({
//             logradouro: stringType(),
//             numero: numberType(),
//         }),
//     },
// })

// type Cliente = typeof defCliente.purefields
// // interface Cliente {
// //     nome: string
// //     endereco: {
// //         logradouro: string;
// //         numero: number;
// //     }
// // }

// const remoto = testRepository<
//     {
//         clientes: {
//             [clienteId: string]: Cliente,
//         },
//     }
//     >({
//         name: "fakeDados",
//         db: {
//             clientes: {
//                 mariaId: {
//                     nome: "Maria",
//                     endereco: {
//                         logradouro: "rua 1",
//                         numero: 100,
//                     },
//                 },
//             },
//         },
//     })

// const dadoMO = mergeableObject<Cliente>().define({
//     basePath: [
//         () => "clientes",
//     ],
//     params: {},
//     methods: {},
//     repositories: [remoto],
// })

// const dadoDD = distribuitedDatabase({
//     dadoMO,
// })
