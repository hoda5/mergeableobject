
export const ptBR = {
    required: "Obrigatório",
    min(min: any) {
        return `Mínimo: ${min}`
    },
    max(min: any) {
        return `Máximo: ${min}`
    },
    minLen(minLen: number) {
        return `Tamanho mínimo: ${minLen}`
    },
    maxLen(maxLen: number) {
        return `Tamanho máximo: ${maxLen}`
    },
    invalid(value: any) {
        return `Inválido (${value})`
    },
}
