// TODO: maybe change back to the one single map data structure LOL
import binaryen from "binaryen";
import { 
    Type,
    typeKind} from "../type/type";
import { basicKind } from "../type/basic";
import { RecordType } from "../type/record";
import { ArrayType } from "../type/array";
import { BasicType } from "../type/basic";

type WasmType = binaryen.Type;

export class Global {
    // all public here is actually very convinient
    public type: Type;
    // it is named 'offset' but it is relative to 0 because globals
    // are stored at the start of the memory
    // memory
    //       stackbase
    //           ⬇
    // -----------------------------------------
    // | globals | stack->       <-heap(maybe) |
    // -----------------------------------------
    public offset: number;

    constructor(type: Type, offset: number) {
        this.type = type;
        this.offset = offset;
    }
}
