import { _mapValues, _inverse } from "../other/hidash";
import * as yup from "yup";

export class YupToJsonSchema {
  isClass(value: any, which: keyof YupToJsonSchema["yupClasses"]) {
    return value instanceof this.yupClasses[which];
  }

  yupClasses = {
    String: yup.string().constructor,
    Number: yup.number().constructor,
    Object: yup.object().constructor,
    Array: yup.array().constructor,
    Mixed: yup.mixed().constructor,
    Boolean: yup.boolean().constructor
  };

  run(_inp: any) {
    if (!_inp) return;
    const nullable = _inp.isValidSync(null) || undefined;
    //TODO substituir IFs por um MAP
    if (this.isClass(_inp, "Object")) {
      const inp: any = _inp;
      const properties = _mapValues(inp.fields || {}, (k, v) => {
        return this.run(v);
      });
      const keys = Object.keys(properties);
      if (!keys.length) return;
      const required = keys.filter(key => {
        const field = inp.fields[key];
        return !field.isValidSync(undefined);
      });
      return {
        type: "object",
        properties,
        required: required.length ? required : undefined,
        nullable
      };
    } else if (this.isClass(_inp, "Number")) {
      return {
        type: "number",
        nullable
      };
    } else if (this.isClass(_inp, "String")) {
      return {
        type: "string",
        nullable
      };
    } else if (this.isClass(_inp, "Array")) {
      const inp = _inp as any;
      const items = this.run(inp._subType || yup.string);
      return {
        type: "array",
        items
      };
    } else if (this.isClass(_inp, "Mixed")) {
      return {
        type: "object",
        nullable
      };
    } else if (this.isClass(_inp, "Boolean")) {
      return {
        type: "boolean",
        nullable
      };
    }
  }
}
