
import * as React from "react";
import * as TestRenderer from "react-test-renderer";
import { defineMergeableObject } from "./MergeableObject";
import { enableDebug, disableDebug, h5debug } from "@hoda5/h5debug";

interface Dado {
    nome: string;
    endereco: {
        logradouro: string;
        numero: number;
    };
}

const DadoDB: {
    [guid: string]: Dado,
} = {
    mariaId: {
        nome: "Maria",
        endereco: {
            logradouro: "rua 1",
            numero: 100,
        },
    },
};

const simulaFirebase = {
    subs: [] as Array<(actual: string) => void>,
    ref(query: string) {
        if (query.substr(0, 7) !== "/dado/") throw new Error("colecao inválida");
        const path2 = query.substr(7);
        const key = path2.split("/")[0];
        if (!key) throw new Error("chave inválida");
        return {
            on(f: (d: Dado) => void) {
                const fa: any = f;
                if (fa.$) throw new Error("Já fez on pra essa função");
                fa.$ = (actual: string) => {
                    if (actual === key) {
                        setTimeout(() => f(DadoDB[key]), 10);
                    }
                };
                simulaFirebase.subs.push(fa.$);
            },
            off(f: (d: Dado) => void) {
                const fa: any = f;
                if (fa.$) {
                    const i = simulaFirebase.subs.indexOf(fa.$);
                    if (i >= 0) simulaFirebase.subs.splice(i, 1);
                }
            },
        };
    },
    update(changes: object) {
        const changedKeys = {};
        Object.keys(changes).forEach((path) => {
            if (path.substr(0, 7) !== "/dado/") throw new Error("colecao inválida");
            const path2 = path.substr(7);
            const key = path2.split("/")[0];
            if (!key) throw new Error("chave inválida");
            changedKeys[key] = true;
            DadoDB.setPropByPath(path2, changes[path], true);
        });
        Object.keys(changedKeys).forEach((key) => {
            simulaFirebase.subs.forEach((f) => f(key));
        });
    },
};

const DadoRx = defineMergeableObject({
    h5debugname: "DadoRx",
    init: null as any as Dado,
    methods: {},
    onSubscribe(query, onPull) {
        simulaFirebase.ref(query).on(refreshData);
        function refreshData(val: Dado) {
            onPull(DadoDB[query]);
        }
        return {
            stop() {
                simulaFirebase.ref(query).off(refreshData);
            },
        };
    },
    onPush() {
        return;
    },
});

describe("tracker", () => {
    beforeEach(() => enableDebug("@hoda5/tracker", { disbleConsole: true }));
    afterEach(() => disableDebug("@hoda5/tracker"));
    it("MergeableObject", async () => {
        const dadoRx = new DadoRx("/dado/mariaId");
        expect(dadoRx.pending).toBeTruthy();
    });
});
