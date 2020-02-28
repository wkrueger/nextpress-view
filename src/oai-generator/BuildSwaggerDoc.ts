import { GetPaths } from "./GetPaths";
import { RouteDict, RouterBuilder } from "../RouterBuilder";

export interface DocOpts {
  groups: RouteDict;
  host: string;
  info: string;
  basePath: string;
}

export class BuildSwaggerDoc {
  getPaths = new GetPaths();

  run({ groups, host, info, basePath }: DocOpts) {
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

  getRoute(routerBuider: RouterBuilder, opts: DocOpts) {
    return routerBuider.route({ method: "GET" }).handler(async () => {
      return this.run(opts);
    });
  }
}
