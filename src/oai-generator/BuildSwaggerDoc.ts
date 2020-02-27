import { GetPaths } from "./GetPaths";
import { RouteDict } from "../RouterBuilder";

export class BuildSwaggerDoc {
  getPaths = new GetPaths();

  run({
    groups,
    host,
    info,
    basePath
  }: {
    groups: RouteDict;
    host: string;
    info: string;
    basePath: string;
  }) {
    const { tags } = this.getPaths.getTags(groups);

    const baseDoc = {
      swagger: "2.0",
      info: info,
      host: host || undefined,
      basePath: basePath,
      tags,
      paths: this.getPaths.run({ groups })
    };
    return baseDoc;
  }
}
