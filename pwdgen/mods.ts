// in golang
// func gen(length int) string {
//     var source = "abcdefghijkpqrstuvwxyz" +
//         "2345679" +
//         "ABCDEFGHIJKLMNPQRSTUVWXYZ"
//     var retval []byte
//     rand.Seed(time.Now().UnixNano())
//     retval = make([]byte, length, length)
//     for i := 0; i < length; i++ {
//         retval[i] = source[rand.Intn(len(source))]
//     }
//     return string(retval)
// }

export function gen(length: number): string {
    const chars =
        "abcdefghijkpqrstuvwxyz" +
        "2345679" +
        "ABCDEFGHIJKLMNPQRSTUVWXYZ"

    let result = ""
    for (let i = 0; i < length; i++) {
        result += chars[Math.floor(Math.random() * chars.length)]
    }
    return result
}
