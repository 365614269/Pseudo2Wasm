// TODO: get rid of the main function
import binaryen from "binaryen";

import { Scanner } from "./lex/scanner";
import { Parser } from "./syntax/parser";
import { Generator } from "./codegen/generator";
import { Checker } from "./type/checker";

export class Compiler {
    private input: string;

    constructor(input: string) {
        this.input = input;
    }

    compile(log: boolean): binaryen.Module {
        const scanner = new Scanner(this.input);
        const tokens = scanner.scan();
        console.log(tokens);
        const parser = new Parser(tokens);
        const ast = parser.parse();
        console.log(ast);
        const checker = new Checker(ast);
        const typedAst = checker.check();
        if (log) {
            console.log(tokens);
            console.log(ast);
            console.log(typedAst);
        }
        const generator = new Generator(typedAst);
        const module = generator.generate();
        return module;
    }

    async runtime(): Promise<number> {
        const module = this.compile(false);

        // module.optimize();

        console.log(module.emitText());
        const wasm = module.emitBinary();

        // initialize import objects
        const memory = new WebAssembly.Memory({ initial: 1, maximum: 2 });
        const importObect = {
            env: {
                buffer: memory,
                logNumber: (output: number) => {
                    console.log(output);
                },
                logString: (output: number) => {
                    const bytes = new Uint8Array(memory.buffer, output);
                    const str = bytes.toString();
                    console.log(str);
                }
            },
        }

        // FIXME: not updated version, test() has the newest functions
        const { instance } = await WebAssembly.instantiate(wasm, importObect);

        const main = instance.exports.main as CallableFunction;
        const start = new Date().getTime();
        main();
        const end = new Date().getTime();
        return end - start;
    }

    // the test function
    async test(expected: number | string): Promise<Boolean> {
        let correct = false;

        const module = this.compile(false);

        // module.optimize();

        if (!module.validate()) {
            throw new Error("Module validation error");
        }

        const text = module.emitText();
        console.log(text);
        const wasm = module.emitBinary();
        // console.log(wasm);

        // initialize import objects
        const memory = new WebAssembly.Memory({ initial: 2, maximum: 10 });
        const maxSize = 65536 * 2 - 1;

        // input test
        const inputInteger = () => Promise.resolve(32);
        const inputReal = () => Promise.resolve(3.14);
        const inputChar = () => Promise.resolve('a'.charCodeAt(0));
        const inputString = () => Promise.resolve(0);

        // @ts-ignore
        const suspendingInputInteger = new WebAssembly.Function(
            { parameters: ["externref"], results: ["i32"] },
            inputInteger,
            { suspending: "first" }
        );
        // @ts-ignore
        const suspendingInputReal = new WebAssembly.Function(
            { parameters: ["externref"], results: ["f64"] },
            inputReal,
            { suspending: "first" }
        );
        // @ts-ignore
        const suspendingInputChar = new WebAssembly.Function(
            { parameters: ["externref"], results: ["i32"] },
            inputChar,
            { suspending: "first" }
        );
        // @ts-ignore
        const suspendingInputString = new WebAssembly.Function(
            { parameters: ["externref"], results: ["i32"] },
            inputString,
            { suspending: "first" }
        );


        // TODO: currently import many log functions, change to only logString later
        const importObect = {
            env: {
                buffer: memory,
                logInteger: (output: number) => {
                    correct = (output == expected);
                    console.log(output);
                },
                logReal: (output: number) => {
                    correct = (output == expected);
                    console.log(output);
                },
                logChar: (output: number) => {
                    correct = (String.fromCharCode(output) == expected);
                    console.log(String.fromCharCode(output));
                },
                logString: (output: number) => {
                    const bytes = new Uint8Array(memory.buffer, output, maxSize - output);
                    let str = new TextDecoder("utf8").decode(bytes);
                    str = str.split('\0')[0];
                    correct = (str == expected);
                    console.log(str);
                },
                inputInteger: suspendingInputInteger,
                inputReal: suspendingInputReal,
                inputChar: suspendingInputChar,
                inputString: suspendingInputString,
            },
        }

        const { instance } = await WebAssembly.instantiate(wasm, importObect);

        // @ts-ignore
        const main = new WebAssembly.Function(
            { parameters: [], results: ["externref"] },
            instance.exports.main,
            { promising: "first" }
        );

        await main();

        // for debug
        // debugger;
        // const main = instance.exports.main as CallableFunction;
        // const start = new Date().getTime();
        // main();
        // const end = new Date().getTime();
        // console.log("Execution time: ", end - start);

        return correct;
    }
}
