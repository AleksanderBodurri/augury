import { NgModulesRegistry, parseModulesFromRootElement } from './parse-modules';
import { Observable, Subject } from 'rxjs';
import { run } from 'tslint/lib/runner';

declare const getAllAngularTestabilities: Function;
declare const getAllAngularRootElements: Function;
declare const ng: any;

export const isAngular = (): boolean => {
  return typeof getAllAngularTestabilities === 'function' && typeof getAllAngularRootElements === 'function';
};

export const isDebugMode = (): boolean => {
  if (typeof getAllAngularRootElements === 'function' && typeof ng !== 'undefined') {
    const rootElements = getAllAngularRootElements();
    const firstRootDebugElement = rootElements && rootElements.length ? ng.probe(rootElements[0]) : null;

    return firstRootDebugElement !== null && firstRootDebugElement !== void 0 && firstRootDebugElement.injector;
  }
  return false;
};

export const isIvy = (): boolean => {
  return typeof ng !== 'undefined' && typeof ng.getComponent === 'function';
};

export const ivySubject: Subject<void> = new Subject();

let originalTemplateFunction: Function;

// Use this function sparingly.
export const runInCompatibilityMode = (options: {
  ivy: { call: Function; args?: Array<any> };
  fallback: { call: Function; args?: Array<any> };
}) => {
  let compatibleFunction;
  let args;
  if (isIvy()) {
    compatibleFunction = options.ivy.call;
    args = options.ivy.args || [];
  } else {
    compatibleFunction = options.fallback.call;
    args = options.fallback.args || [];
  }
  return compatibleFunction.apply(this, args);
};

export const appIsStable = stabilityObject => {
  return runInCompatibilityMode({
    ivy: {
      call: () => {
        const app = ng.getComponent(getAllAngularRootElements()[0]);
        const appTemplateView = app.__ngContext__.debug.childHead.tView;
        originalTemplateFunction = originalTemplateFunction || appTemplateView.template;
        appTemplateView.template = (...args) => {
          originalTemplateFunction.apply(this, [...args]);
          ivySubject.next();
        };
        return ivySubject as Observable<void>;
      }
    },
    fallback: {
      call: moduleParserHelperObject => {
        // side effect
        moduleParserHelperObject.appRef = parseModulesFromRootElement(
          moduleParserHelperObject.roots[0],
          moduleParserHelperObject.parsedModulesData
        );
        return moduleParserHelperObject.appRef.isStable;
      },
      args: [stabilityObject]
    }
  });
};
