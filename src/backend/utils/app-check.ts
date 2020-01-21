import { NgModulesRegistry, parseModulesFromRootElement } from './parse-modules';
import { Observable, Subject } from 'rxjs';

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

export const appIsStable = (stabilityObject?) => {
  if (isIvy()) {
    const app = ng.getComponent(getAllAngularRootElements()[0]);
    const appTemplateView = app.__ngContext__.debug.childHead.tView;
    originalTemplateFunction = originalTemplateFunction || appTemplateView.template;
    appTemplateView.template = (...args) => {
      originalTemplateFunction.apply(this, [...args]);
      ivySubject.next();
    };
    return ivySubject as Observable<void>;
  } else {
    stabilityObject.appRef = parseModulesFromRootElement(stabilityObject.roots[0], stabilityObject.parsedModulesData);
    return stabilityObject.appRef.isStable;
  }
};
