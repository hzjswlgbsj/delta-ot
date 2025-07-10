type MessageCallback = (data: any, event: MessageEvent) => void;

class IframeMessageManager {
  private targetWindow: Window;
  private targetOrigin: string;
  private listeners: MessageCallback[];

  constructor(targetWindow: Window, targetOrigin: string = "*") {
    this.targetWindow = targetWindow;
    this.targetOrigin = targetOrigin;
    this.listeners = [];

    window.addEventListener("message", this.handleMessage.bind(this));
  }

  // Method to send a message
  public send(message: any): void {
    this.targetWindow.postMessage(message, this.targetOrigin);
  }

  public onMessage(callback: MessageCallback): void {
    this.listeners.push(callback);
  }

  public destroy(): void {
    window.removeEventListener("message", this.handleMessage.bind(this));
    this.listeners = [];
  }

  private handleMessage(event: MessageEvent): void {
    if (this.targetOrigin !== "*" && event.origin !== this.targetOrigin) {
      return;
    }

    this.listeners.forEach((callback) => callback(event.data, event));
  }
}

export default IframeMessageManager;
