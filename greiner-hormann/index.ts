import { polygon, vertex } from './clip.js';

let p1 = new polygon(new vertex(0, 0))
p1.add(new vertex(4, 0))
p1.add(new vertex(4, 4))
p1.add(new vertex(0, 4))
p1.add(new vertex(0, 0))

let v = new vertex(2, 2);
console.log(v.inside(p1))

let p2 = new polygon(new vertex(2, 2))
p2.add(new vertex(6, 2))
p2.add(new vertex(6, 6))
p2.add(new vertex(2, 6))
p2.add(new vertex(2, 2))
p1.union(p2).forEach(p => console.log(p.toString()))
