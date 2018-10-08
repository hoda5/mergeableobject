
import * as React from "react";
import "@hoda5/extensions";
import { h5debug } from "@hoda5/h5debug";

type RReadOnly<T> =
  T extends object ? {
    readonly [name in keyof T]: RReadOnly<T[name]>
  } : T;

type DProxy<
  T extends object,
  M extends {
    [name: string]: (this: DProxy<T, M>, ...args: any[]) => any,
  }> =
  {
    pending: T,
    data: T,
    original: RReadOnly<T>,
    theirs: RReadOnly<T>,
    changes: {
      [name: string]: DValue,
    },
  } & M & {
    reset(): void;
    commit(): void;
    get(path: string): DValue;
    getData(path: string): any;
    setData(path: string, value: any): void;
    unsubscribe(): void;
  };

export interface DValue {
  data: any;
  readonly original: any;
  readonly theirs: any;
  readonly conflict: boolean;
  reset(): void;
  resolve(value: any): void;
}

export function defineMergeableObject<
  T extends object,
  M extends {
    [name: string]: (this: DProxy<T, M>, ...args: any[]) => any,
  }
  >(opts: {
    h5debugname: string,
    init: T,
    methods: M,
    onSubscribe(query: string, onPull: (d: T) => void): {
      stop(): void,
    },
    onPush(d: T): void;
    validate?(data: T): void,
  }): new (query: string) => DProxy<T, M> {

  return ctr as any as new (query: string) => DProxy<T, M>;
  function ctr(this: DProxy<T, M>, query: string) {
    const self: any = this;
    let subinfo: { stop(): void };
    let state: 1 | 2 | 3 = 1;
    let data = {};
    let original = {};
    let theirs = {};
    const { onSubscribe, onPush } = opts;
    const props: PropertyDescriptorMap = {
      pending: {
        get() {
          if (state === 1) subscribe();
          return pending;
        },
      },
      data: {
        get() {
          if (state === 1) subscribe();
          return data;
        },
      },
      original: {
        get() {
          if (state === 1) subscribe();
          return original;
        },
      },
      theirs: {
        get() {
          if (state === 1) subscribe();
          return theirs;
        },
      },
      changes: {
        get() {
          if (state === 1) subscribe();
          return getChanges();
        },
      },
      reset: {
        value() {
          data = original.cloneObj();
        },
      },
      commit: {
        value() {
          push();
        },
      },
      get: {
        value(path: string) {
          const r: DValue = {
            get data() {
              return data.getPropByPath(path);
            },
            set data(value: any) {
              data.setPropByPath(path, value);
            },
            get original() {
              return original.getPropByPath(path);
            },
            get theirs() {
              return theirs.getPropByPath(path);
            },
            get conflict() {
              return false; // TODO
            },
            reset() {
              // TODO
            },
            resolve(value) {
              // TODO
            },
          };
          return r;
        },
      },
      getValue: {
        value(path: string) {
          return data.getPropByPath(path);
        },
      },
      setValue: {
        value(path: string, value: any) {
          data.setPropByPath(path, value);
        },
      },
      unsubscribe: {
        value() {
          unsubscribe();
        },
      },
    };
    Object.defineProperties(self, props);
    function getChanges() {
      // TODO
    }
    function subscribe() {
      if (state !== 1) return;
      data = {};
      original = {};
      theirs = {};
      state = 2;
      subinfo = onSubscribe(query, onPull);
    }
    function unsubscribe() {
      if (state === 1) return;
      state = 1;
      subinfo.stop();
    }

    function onPull(d: T) {
      theirs = d.cloneObj();
      if (state === 2) {
        original = d.cloneObj();
        data = d.cloneObj();
        state = 3;
      }
    }

    function push() {
      if (state === 3) {
        state = 2;
        onPush.call(self, data.cloneObj());
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
