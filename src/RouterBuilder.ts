import express from "express";
import * as yup from "yup";

export interface PriorityRequestHandler extends express.RequestHandler {
  priority?: number;
}

export type SchemaDict = {
  query?: yup.ObjectSchema<any>;
  body?: yup.ObjectSchema<any>;
  params?: yup.ObjectSchema<any>;
};

export interface RouteOpts {
  __tag__?: "routeopts";
  /** defaults to POST */
  method?: string;
  /** run pre-middleware. Can be ordered through the "priority" property */
  middleware?: PriorityRequestHandler[];
  /** apply input validation */
  validation?: SchemaDict;
  /** metadata for schema generators */
  responseType?: { type: "json"; schema: yup.ObjectSchema<any> };
  handler?: Function;
  /** enabled by default, set false to disable */
  withTransaction?: boolean;
}

export type UnwrapSchema<T> = T extends yup.ObjectSchema<infer R> ? R : unknown;

export type UnwrapSchemaDict<T extends SchemaDict> = {
  query: UnwrapSchema<T["query"]>;
  body: UnwrapSchema<T["body"]>;
  params: UnwrapSchema<T["params"]>;
};

export interface Transactionable {
  transaction(i: any): Promise<any>;
}

export type RouteDict = Record<string, RouteOpts | Record<string, RouteOpts>>;
export type RouteDictTagged = Record<
  string,
  RouteOpts | Record<string, RouteOpts>
> & { __tag__: "routedict" };

export interface EditedRequestHandler<Replace = {}> {
  (req: Omit<express.Request, keyof Replace> & Replace): Promise<any>;
}

export type NeverParams = { body: unknown; query: unknown; params: unknown };

export type HandlerType<Opts> = Opts extends { validation: any }
  ? EditedRequestHandler<
      UnwrapSchemaDict<Opts["validation"]> & Nextpress.ExtraRouteArgs
    >
  : EditedRequestHandler<NeverParams>;

export class RouterBuilder {
  constructor(i: { transactionable: Transactionable }) {
    this.transactionable = i.transactionable;
  }

  transactionable?: Transactionable;

  routeDict(i: RouteDict): RouteDictTagged {
    Object.defineProperty(i as any, "__tag__", {
      value: "routedict",
      enumerable: false
    });
    return i as any;
  }

  route = <Opts extends RouteOpts>(opts: Opts = {} as any) => {
    return {
      handler: (fn: HandlerType<Opts>): RouteOpts => {
        return Object.assign(opts, { handler: fn });
      }
    };
  };

  getHandler(routeOpts: RouteOpts) {
    let mw = [...(routeOpts.middleware || [])] || [];
    if (routeOpts.validation) {
      mw.push(this.validateRequestMiddleware(routeOpts.validation));
    }
    mw.sort((a, b) => {
      if (a.priority! < b.priority!) return -1;
      if (a.priority! > b.priority!) return 1;
      return 0;
    });
    let fn: express.RequestHandler = async (req, res, next) => {
      try {
        const result = await this.getResult(routeOpts, req);
        res.send(result);
      } catch (err) {
        next(err);
      }
    };
    return {
      middleware: mw,
      handler: fn
    };
  }

  validateRequestMiddleware(opts: RouteOpts["validation"]) {
    const mw: PriorityRequestHandler = (req, _res, next) => {
      try {
        const what = opts!;
        if (what.query) {
          req.query = what.query.validateSync(req.query);
        }
        if (what.params) {
          req.params = what.params.validateSync(req.params);
        }
        if (what.body) {
          req.body = what.body.validateSync(req.body, { stripUnknown: true });
        }
        next();
      } catch (err) {
        next(err);
      }
    };
    mw.priority = 100;
    return mw;
  }

  async getResult(routeOpts: RouteOpts, req: any) {
    var result: any;
    if (routeOpts.withTransaction !== false && this.transactionable) {
      await this.transactionable.transaction(async trx => {
        req.transaction = trx;
        result = await routeOpts.handler!(req);
      });
    } else {
      result = await routeOpts.handler!(req);
    }
    return result;
  }

  appendRouteDict(router: express.Router, dict: RouteDictTagged) {
    Object.keys(dict).forEach(key => {
      if (key === "__tag__") return;
      let routeOpts = dict[key];
      if (routeOpts.__tag__ === "routedict") {
        const inner = express.Router();
        this.appendRouteDict(inner, routeOpts as RouteDictTagged);
        router.use(key, inner);
      } else {
        let method = String(routeOpts.method || "post").toLowerCase() as any;
        const { middleware, handler } = this.getHandler(routeOpts);
        router[method](key, ...middleware, handler);
      }
    });
  }
}
