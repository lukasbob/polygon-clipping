export class vertex {
  x: number;
  y: number;
  next: vertex;
  prev: vertex;
  nextPoly: vertex | undefined;
  intersect: boolean = false;
  entry: boolean = false;
  neighbor: vertex | undefined;
  alpha: number = 0;
  checked: boolean = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.prev = this;
    this.next = this;
  }

  equals(v: vertex): boolean {
    return this.x == v.x && this.y == v.y;
  }

  // Uses the ray casting algorithm to determine if a point is inside a polygon.
  // https://en.wikipedia.org/wiki/Point_in_polygon#Ray_casting_algorithm
  inside(p: polygon): boolean {
    let windingNumber = 0;
    let infinity = new vertex(1000000, this.y);
    for (let v of p) {
      if (!v.intersect && intersect(this, infinity, v, p.next(v.next)).valid) {
        windingNumber += 1;
      }
    }
    return windingNumber % 2 != 0;
  }

  setChecked(): void {
    this.checked = true;
    if (this.neighbor && !this.neighbor.checked) {
      this.neighbor.setChecked();
    }
  }

  toString(): string {
    return `<${this.x},${this.y}>${this.intersect ? "∩": ""}${this.checked ? "✔": ""}${this.entry ? "↓" : "↑"}`;
  }
}

export class polygon implements Iterable<vertex> {
  first: vertex;
  constructor(v: vertex) {
    this.first = v;
    this.first.next = v;
    this.first.prev = v;
  }

  [Symbol.iterator](): Iterator<vertex, any, undefined> {
    let curr = this.first;
    let done = false;
    return {
      next: (): IteratorResult<vertex> => {
        if (done) {
          return { value: undefined, done: true };
        }
        let v = curr;
        curr = curr.next;
        if (curr === this.first) {
          done = true
        }
        return { value: v, done: false };
      },
    };
  }

  add(v: vertex) {
    if (!this.first) {
      this.first = v;
      this.first.next = v;
      this.first.prev = v;
    } else {
      let next = this.first;
      let prev = next.prev;
      next.prev = v;
      v.next = next;
      v.prev = prev;
      prev.next = v;
    }
  }

  insert(v: vertex, start: vertex, end: vertex) {
    let curr: vertex = start;
    while (!curr.equals(end) && curr.alpha < v.alpha) {
      curr = curr.next;
    }
    v.next = curr;
    let prev = curr.prev;
    v.prev = prev;
    prev.next = v;
    curr.prev = v;
  }

  // Find the next vertex in the polygon that is not an intersection
  next(v: vertex): vertex {
    let c = v;
    while (c.intersect) {
      c = c.next;
    }
    return c;
  }

  nextPoly(): vertex | undefined {
    return this.first.nextPoly;
  }

  firstIntersect(): vertex {
    let ix = this.first;
    for (let v of this) {
      if (v.intersect && !v.checked) {
        ix = v;
        break;
      }
    }
    return ix;
  }

  unprocessed(): boolean {
    for (let v of this) {
      if (v.intersect && !v.checked) {
        return true;
      }
    }
    return false;
  }

  points(): { x: number; y: number }[] {
    let fields = [];
    for (let v of this) {
      fields.push({ x: v.x, y: v.y });
    }
    return fields;
  }

  clip(clip: polygon, sourceFwd: boolean, clipFwd: boolean): Array<polygon> {
    // Phase one: find intersections
    for (let s of this) {
      if (!s.intersect) {
        for (let c of clip) {
          if (!c.intersect) {
            let ix = intersect(s, this.next(s.next), c, clip.next(c.next));
            if (ix.valid) {
              let iS = new vertex(ix.x, ix.y);
              iS.alpha = ix.toSource;
              iS.intersect = true;
              iS.entry = false;
              let iC = new vertex(ix.x, ix.y);
              iC.alpha = ix.toClip;
              iC.intersect = true;
              iC.entry = false;
              iS.neighbor = iC;
              iC.neighbor = iS;
              this.insert(iS, s, this.next(s.next));
              clip.insert(iC, c, clip.next(c.next));
            }
          }
        }
      }
    }

    // phase two: identify entry/exit points
    sourceFwd = boolXor(sourceFwd, this.first.inside(clip));
    for (let s of this) {
      if (s.intersect) {
        s.entry = sourceFwd;
        sourceFwd = !sourceFwd;
      }
    }

    clipFwd = boolXor(clipFwd, clip.first.inside(this));
    for (let c of clip) {
      if (c.intersect) {
        c.entry = clipFwd;
        clipFwd = !clipFwd;
      }
    }

    // phase three: list of clipped polygons.
    let list = Array<polygon>();
    while (this.unprocessed()) {
      let curr = this.firstIntersect();
      let clipped = new polygon(new vertex(curr.x, curr.y));
      do {
        curr.setChecked();
        if (curr.entry) {
          do {
            curr = curr.next;
            clipped.add(new vertex(curr.x, curr.y));
          } while (!curr.intersect);
        } else {
          do {
            curr = curr.prev;
            clipped.add(new vertex(curr.x, curr.y));
          } while (!curr.intersect);
        }
        curr = curr.neighbor || this.first;
      } while (!curr.checked);
      list.push(clipped);
    }
    return list;
  }

  union(p: polygon) {
    return this.clip(p, false, false);
  }

  intersection(p: polygon) {
    return this.clip(p, true, true);
  }

  difference(p: polygon) {
    return this.clip(p, false, true);
  }

  toString(): string {
    let arr = Array.from(this)
    return arr.map(v => v.toString()).join(",")
  }

}

function boolXor(a: boolean, b: boolean): boolean {
  return (a && !b) || (!a && b);
}

type intersection = {
  x: number;
  y: number;
  toSource: number;
  toClip: number;
  valid: boolean;
};

export function intersect(
  s1: vertex,
  s2: vertex,
  c1: vertex,
  c2: vertex
): intersection {
  let ix = { x: 0, y: 0, toSource: 0, toClip: 0, valid: false };
  const d = (c2.y - c1.y) * (s2.x - s1.x) - (c2.x - c1.x) * (s2.y - s1.y);
  if (d === 0) {
    return ix;
  }
  ix.toSource =
    ((c2.x - c1.x) * (s1.y - c1.y) - (c2.y - c1.y) * (s1.x - c1.x)) / d;
  ix.toClip =
    ((s2.x - s1.x) * (s1.y - c1.y) - (s2.y - s1.y) * (s1.x - c1.x)) / d;
  ix.valid =
    0 < ix.toSource && ix.toSource < 1 && 0 < ix.toClip && ix.toClip < 1;
  if (ix.valid) {
    ix.x = s1.x + ix.toSource * (s2.x - s1.x);
    ix.y = s1.y + ix.toSource * (s2.y - s1.y);
  }
  return ix;
}
