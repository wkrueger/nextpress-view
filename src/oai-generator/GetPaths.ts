import { RouteDict } from "../RouterBuilder";
import { _groupBy, _mapValues, _camelCase } from "../other/hidash";
import { YupToJsonSchema } from "./YupToJsonSchema";

export class GetPaths {
  yupToJsonSchema = new YupToJsonSchema();

  DEFAULT_RESPONSES = {
    200: {
      description: "Success."
    }
  };

  getTags(groups: RouteDict) {
    const tagsMapping = {} as Record<string, string>;
    const tags: { name: string }[] = Object.keys(groups)
      .map(tag => {
        if (tag.startsWith("__")) return null as never;
        const srcpath = tag;
        if (tag.startsWith("/")) tag = tag.substr(1);
        tag = tag.replace(/\//g, "_");
        tagsMapping[srcpath] = tag;
        return { name: tag };
      })
      .filter(Boolean);
    return { tagsMapping, tags };
  }

  run({ groups }: { groups: RouteDict }) {
    const tagInfo = this.getTags(groups);
    const out = {} as any;
    Object.keys(tagInfo.tagsMapping).forEach(basePath => {
      const routeGroup = Object.entries(groups[basePath]);
      const groupedByRoute = _groupBy(routeGroup, g => g[0]);
      Object.values(groupedByRoute).forEach(group => {
        const fullRoute = basePath + group[0][0];
        const methods: Record<string, any> = {};
        group.forEach(([_path, routeOpts]) => {
          const methodStr = (routeOpts.method || "post").toLowerCase();
          const schemas = _mapValues(routeOpts.validation || {}, (_, value) => {
            return this.yupToJsonSchema.run(value);
          });
          const parameters = [] as any;
          if (schemas.body) {
            parameters.push({
              name: "body",
              in: "body",
              required: true,
              schema: schemas.body
            });
          }
          if (schemas.query) {
            Object.keys(schemas.query.properties).forEach(key => {
              parameters.push({
                ...schemas.query.properties[key],
                name: key,
                in: "query",
                required: (schemas.query.required || []).includes(key)
              });
            });
          }
          if (schemas.params) {
            Object.keys(schemas.params.properties).forEach(key => {
              parameters.push({
                ...schemas.params.properties[key],
                name: key,
                in: "query",
                required: (schemas.params.required || []).includes(key)
              });
            });
          }
          methods[methodStr] = {
            tags: [tagInfo.tagsMapping[basePath]],
            operationId: _camelCase(
              fullRoute.replace(/\//g, "_") + "_" + methodStr
            ),
            consumes: ["application/json"],
            produces: ["application/json"],
            parameters,
            responses: this.DEFAULT_RESPONSES
          };
        });
        out[fullRoute] = methods;
      });
    });
    return out;
  }
}
