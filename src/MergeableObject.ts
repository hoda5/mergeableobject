
import * as React from "react"
import "@hoda5/extensions"
import { h5debug } from "@hoda5/h5debug"

export type PathPart<T> = keyof T
  | { [name: string]: (value: any) => (false | string | GUID | Array<string | GUID>) }
  | (() => (false | string | GUID | Array<string | GUID>))
export type Path<T> = Array<PathPart<T>>
export interface QueryParams { [name: string]: any }

export type Subscription<
  T extends object,
  C extends object,
  M extends {
    [name: string]: (this: Subscription<T, C, M, P>, ...args: any[]) => any,
  },
  P extends QueryParams,
  > =
  {
    readonly fullPath: string;
    readonly pending: boolean;
    my: T & ReadOnlyObject<C>,
    original: ReadOnlyObject<T & C>,
    theirs: ReadOnlyObject<T & C>,
    changes: {
      [name: string]: MergeableValue,
    },
  } & M & {
    reset(): void;
    commit(): void;
    get(relativePath: string): MergeableValue;
    getMy(relativePath: string): any;
    setMy(relativePath: string, value: any): void;
    unsubscribe(): void;
  }

export interface MergeableValue {
  my: any
  readonly original: any
  readonly theirs: any
  readonly conflict: boolean
  reset(): void
  resolve(value: any): void
}

export interface Repository {
  name: string
  onSubscribe(fullPath: string, onPull: (delta: object) => void): {
    stop(): void,
  }
  onPush(delta: object): void
}

export function testRepository<T>(opts: { name: string, db: T }) {
  const handles: Array<{ fullPath: string, onPull: (delta: object) => void }> = []
  const testdb = opts.db
  let mydb = testdb.cloneObj()
  const self: Repository & { db: T, resetDB(): Promise<void> } = {
    name: opts.name,
    db: opts.db,
    async resetDB() {
      mydb = testdb.cloneObj()
    },
    onSubscribe(fullPath, onPull) {
      const handle = { fullPath, onPull }
      handles.push(handle)
      notify()
      return {
        stop() {
          const i = handles.indexOf(handle)
          if (i >= 0) handles.splice(i, 1)
        },
      }
    },
    onPush(delta) {
      Object.keys(delta).forEach((fullPath) => {
        mydb.setPropByPath(fullPath, delta[fullPath])
      })
      notify()
    },
  }
  return self
  function notify() {
    handles.forEach((h) => {
      asap(() => {
        const v = mydb.getPropByPath(h.fullPath)
        h.onPull({ [h.fullPath]: v })
      })
    })
  }
}

export function distribuitedDatabase<DOCS extends {
  [name: string]: MergeableObject<any, any, any, any, any>,
}>(docs: DOCS): {
    docs: {
      [name in keyof DOCS]: {
        doc: DOCS[name],
        search(): void,
        validate(): void,
      }
    },
  } {
  return null as any
}

export function mergeableObject<T extends object>() {
  return {
    define<
      M extends {
        [name: string]: (this: Subscription<T, {}, M, P>, ...args: any[]) => any,
      },
      P extends QueryParams,
      >(opts: {
        basePath: Path<P>,
        methods: M,
        params: P,
        repositories: Repository[],
        validate?(data: T): void,
      }) {
      return defineMergeableObject<T, {}, {}, M, P>(opts)
    },
    // withComputation<C extends object>( fn: (data: T)
  }
}

export interface MergeableObject<
  T extends object,
  C1 extends object,
  C2 extends object,
  M extends {
    [name: string]: (this: Subscription<T, C1 & C2, M, P>, ...args: any[]) => any,
  },
  P extends QueryParams,
  > {
  subscribe(queryParams: P & { id: GUID }, onChange: (subscription: Subscription<T, C1 & C2, M, P>) => void):
    Subscription<T, C1 & C2, M, P>,
}

function defineMergeableObject<
  T extends object,
  C1 extends object,
  C2 extends object,
  M extends {
    [name: string]: (this: Subscription<T, C1 & C2, M, P>, ...args: any[]) => any,
  },
  P extends QueryParams,
  >(opts: {
    basePath: Path<P>,
    methods: M,
    params: P,
    computation1?: {
      [name in keyof C1]: () => C1[name]
    },
    computation2?: {
      [name in keyof C2]: () => C2[name]
    }
    repositories: Repository[],
    validate?(data: T): void,
  }): MergeableObject<T, C1, C2, M, P> {

  const { basePath, repositories } = opts
  const subscriptions: { [relativePath: string]: Subscription<any, any, any, any> } = {}

  return {
    subscribe(queryParams: P, onChange) {
      const fullPath = resolveQueryPath([...basePath, "id"], queryParams)
      let sub = subscriptions[fullPath]
      if (!sub) {
        sub = subscriptions[fullPath] = createSubscribe(fullPath)
      }
      sub.addChangeListenner(onChange)
      return sub
    },
  }
  function createSubscribe(fullPath: string) {
    const self: Subscription<T, C1 & C2, M, P> = {} as any
    const changeListenners: Array<(subscription: Subscription<T, C1 & C2, M, P>) => void> = []
    let subinfo: Array<{ stop(): void }> | undefined
    let state: 1 | 2 | 3 | 4 = 1 // 1=not initialized, 2=subscribing, 3=clean, 4=dirty
    let _my = {}
    let _original = {}
    let _theirs = {}

    const props: PropertyDescriptorMap = {
      fullPath: {
        value: fullPath,
      },
      pending: {
        get() {
          if (state <= 2) subscribe()
          return state <= 2
        },
      },
      dirty: {
        get() {
          if (state <= 2) subscribe()
          return state === 2 && getChanges()
        },
      },
      my: {
        get() {
          if (state === 1) subscribe()
          return _my.proxyIt(() => {
            if (state === 3) state = 4
            dispathChanges()
          })
        },
      },
      original: {
        get() {
          if (state === 1) subscribe()
          return _original
        },
      },
      theirs: {
        get() {
          if (state === 1) subscribe()
          return _theirs
        },
      },
      changes: {
        get() {
          if (state === 1) subscribe()
          return getChanges()
        },
      },
      reset: {
        value() {
          if (state === 3) reset()
        },
      },
      commit: {
        value() {
          if (state === 3) commitAndPush()
        },
      },
      get: {
        value(relativePath: string) {
          const r: MergeableValue = {
            get my() {
              return _my.getPropByPath(relativePath)
            },
            set my(value: any) {
              _my.setPropByPath(relativePath, value)
              if (state === 3) state = 4
              dispathChanges()
            },
            get original() {
              return _original.getPropByPath(relativePath)
            },
            get theirs() {
              return _theirs.getPropByPath(relativePath)
            },
            get conflict() {
              const o = _original.getPropByPath(relativePath)
              const t = _theirs.getPropByPath(relativePath)
              return Object.compareObj(o, t, true) !== 0
            },
            reset() {
              // TODO
            },
            resolve(value) {
              // TODO
            },
          }
          return r
        },
      },
      getValue: {
        value(relativePath: string) {
          return _my.getPropByPath(relativePath)
        },
      },
      setValue: {
        value(relativePath: string, value: any) {
          _my.setPropByPath(relativePath, value)
          if (state === 3) state = 4
          dispathChanges()
        },
      },
      addChangeListenner: {
        value(onChange: (subscription: Subscription<T, C1 & C2, M, P>) => void) {
          changeListenners.push(onChange)
        },
      },
      unsubscribe: {
        value: unsubscribe,
      },
    }
    Object.defineProperties(self, props)
    return self
    function getChanges(): false | { [relativePath: string]: MergeableValue } {
      const changes: { [relativePath: string]: MergeableValue } = {}
      const hasChanges = compare("", _my, _theirs, _original)
      if (hasChanges) {
        state = 4
        return changes
      }
      state = 3
      return false
      function compare(path: string, d: any, t: any, o: any): boolean {
        let wasChanged = false
        d = Object.isObject(d) ? d : {}
        t = Object.isObject(t) ? t : {}
        o = Object.isObject(o) ? o : {}
        let cprops = Object.keys(d).concat(Object.keys(t)).concat(Object.keys(o))
        cprops = cprops.filter((p, idx) => cprops.indexOf(p) !== idx)
        cprops.forEach((p) => {
          const pd = d[p]
          const pt = t[p]
          const po = o[p]
          if (Object.prototype.compareObj(pd, po, true) !== 0) {
            wasChanged = true
            const ppath = [path, p, ""].join("")
            const isObj = Object.isObject(pd) || Object.isObject(pt) || Object.isObject(po)
            if (isObj) compare(ppath, pd, pt, po)
            else changes[ppath] = self.get(ppath)
          }
        })
        return wasChanged
      }
    }
    function dispathChanges() {
      changeListenners.forEach((ev) => asap(() => ev(self)))
    }

    function subscribe() {
      if (state !== 1) return
      _my = {}
      _original = {}
      _theirs = {}
      state = 2
      subinfo = repositories.map((r) => r.onSubscribe(fullPath, (delta) => {
        const l = fullPath.length
        Object.keys(delta).forEach((dfp) => {
          if (dfp.substr(0, l) === fullPath) {
            const drp = dfp.substr(l)
            const d = delta[dfp]
            _theirs.setPropByPath(drp, d, true)
          }
        })
        if (state <= 3) {
          _original = _theirs.cloneObj()
          _my = _original.cloneObj()
          state = 3
        }
        dispathChanges()
      }))
    }
    function unsubscribe() {
      if (state === 1) return
      state = 1
      const si = subinfo
      subinfo = undefined
      if (si) si.forEach((s) => s.stop())
    }

    function onPull(d: T) {
      _theirs = d.cloneObj()
      if (state === 2) {
        _original = d.cloneObj()
        _my = d.cloneObj()
        state = 3
      }
    }

    function reset() {
      _original = _theirs.cloneObj()
      _my = _original.cloneObj()
      state = 3
      dispathChanges()
    }

    function commitAndPush() {
      if (state === 3) {
        subinfo = repositories.map((r) => r.onPush.call(getChanges()))
        state = 2
      }
    }
  }
}

// public rx<P>(Component: React.ComponentType<P>): React.ComponentClass<P> {
//   const dep = this;
//   // tslint:disable-next-line:max-classes-per-file
//   return class extends React.Component<P, {}, {}> {
//     public comp?: any;
//     public componentWillMount() {
//       this.comp = autorun((dep as any).h5debugname + ".rx", () => {
//         dep.depend();
//         nonreactive(() => this.setState({}));
//       });
//     }
//     public componentWillUnmount() {
//       if (this.comp) {
//         this.comp.stop();
//       }
//     }
//     public render() {
//       return React.createElement(ErrorBoundary, null,
//         React.createElement(Component, this.props));
//     }
//   };
// }
// }

// // tslint:disable-next-line:max-classes-per-file
// class ErrorBoundary extends React.Component<{}, { hasError: false | string }> {
// constructor(props) {
//   super(props);
//   this.state = { hasError: false };
// }

// public componentDidCatch(error, info) {
//   this.setState({
//     hasError: JSON.stringify({
//       info,
//       error: error.stack ? error.stack.toString() : error.message,
//     }, null, 2).replace(/\\n/g, "\n"),
//   });
// }

// public render() {
//   if (this.state.hasError) return React.createElement("pre", null, this.state.hasError);
//   return this.props.children;
// }
// }

export function resolveQueryPath<P extends QueryParams>(
  path: Path<P>, paramValues: P): string {
  const arr: Array<string | GUID> = []
  path.forEach((p) => {
    const t = typeof p
    if (t === "string") p = paramValues[p as any]
    else if (t === "object") {
      const n = Object.keys(p)[0]
      const fn: any = p[n]
      p = fn(paramValues[n])
    } else if (t === "function") {
      p = (p as any)()
    }
    if (Array.isArray(p)) arr.push(...p)
    else arr.push(p as any)
  })
  // if (h5debug.h5doc) h5debug.h5doc(qry.name, qry.paramValues, "resolveQueryPath", r)
  return arr.join("/")
}


export interface DocDecl<FIELDS extends DocFields> {
  name: string,
  fields: FIELDS,
}

export interface DocDef<FIELDS extends DocFields> {
  name: string,
  fields: FIELDS,
  data: PureField<FIELDS>
}

export type PureField<T> =
  T extends DocField<infer K> ? K :
  T extends DocFields ? {
      [name in keyof T]: PureField<T[name]>
  }
  : unknown

export interface DocFields {
  [name: string]: DocField<any>
}

export interface DocField<T> {
  fieldName: string
  fieldType: DocFieldType<T>
  value: T
}

export interface DocFieldType<T> {
  fieldType: T
  new(): DocField<T>
  validate(v: T): boolean
}

export function defDoc<FIELDS extends DocFields>
  (dd: DocDecl<FIELDS>): DocDef<FIELDS> {
  return null as any
}
