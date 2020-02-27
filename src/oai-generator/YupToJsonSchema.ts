import { _mapValues } from "../other/hidash";
import * as yup from "yup";

export class YupToJsonSchema {
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
    const yupClasses = this.yupClasses;
    //TODO substituir IFs por um MAP
    if (_inp instanceof yupClasses.Object) {
      const inp: any = _inp;
      const properties = _mapValues(inp.fields || {}, v => {
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
    } else if (_inp instanceof yupClasses.Number) {
      return {
        type: "number",
        nullable
      };
    } else if (_inp instanceof yupClasses.String) {
      return {
        type: "string",
        nullable
      };
    } else if (_inp instanceof yupClasses.Array) {
      const inp = _inp as any;
      const items = this.run(inp._subType || yup.string);
      return {
        type: "array",
        items
      };
    } else if (_inp instanceof yupClasses.Mixed) {
      return {
        type: "object",
        nullable
      };
    } else if (_inp instanceof yupClasses.Boolean) {
      return {
        type: "boolean",
        nullable
      };
    }
  }
}
