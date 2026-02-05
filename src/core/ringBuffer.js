export class RingBuffer {
  constructor(size) {
    this.size = size;
    this.data = new Array(size);
    this.index = 0;
    this.length = 0;
  }

  push(item) {
    this.data[this.index] = item;
    this.index = (this.index + 1) % this.size;
    this.length = Math.min(this.length + 1, this.size);
  }

  toArray() {
    if (this.length < this.size) return this.data.slice(0, this.length);
    return [...this.data.slice(this.index), ...this.data.slice(0, this.index)];
  }

  last(n = 1) {
    const arr = this.toArray();
    return arr.slice(Math.max(0, arr.length - n));
  }

  clear() {
    this.data = new Array(this.size);
    this.index = 0;
    this.length = 0;
  }
}
