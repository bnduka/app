
declare module 'vis-network' {
  export class Network {
    constructor(container: HTMLElement, data: any, options?: any);
    on(event: string, callback: (params: any) => void): void;
    destroy(): void;
    fit(): void;
    redraw(): void;
    getScale(): number;
    moveTo(options: any): void;
  }
  
  export class DataSet {
    constructor(data?: any[]);
    add(data: any): void;
    update(data: any): void;
    remove(id: any): void;
    get(): any[];
  }
}
