import { nz } from '@binance-trader/shared';

export const getMESA = function getMESA(hl2: number[]) {
  const fl = 0.5;
  const sl = 0.05;

  const vars: Record<string, number[]> = {
    sp: [],
    dt: [],
    q1: [],
    i1: [],
    jI: [],
    jQ: [],
    i2: [],
    q2: [],
    re: [],
    im: [],
    p: [],
    p1: [],
    p2: [],
    p3: [],
    spp: [],
    phase: [],
    dphase: [],
    alpha: [],
    mama: [],
    fama: [],
  };

  const fillWithZeros = (o: Record<string, number[]>) => {
    for (const key in o) {
      o[key].unshift(0);
    }
  };

  const compute = (a: number[], p: number) =>
    (0.0962 * a[0] +
      0.5769 * nz(a[2]) -
      0.5769 * nz(a[4]) -
      0.0962 * nz(a[6])) *
    (0.075 * nz(p) + 0.54);

  hl2.forEach((current, index, array) => {
    if (index < 5) {
      return fillWithZeros(vars);
    }

    const previousPrices = array.slice(0, index).slice(-5).reverse();

    vars.sp.unshift(
      (4 * current +
        3 * nz(previousPrices[0]) +
        2 * nz(previousPrices[1]) +
        nz(previousPrices[2])) /
        10,
    );

    // const smooth = [currentSmooth].concat(acc.smooth);
    const currentDetrender = compute(vars.sp, vars.p[0]);
    vars.dt.unshift(currentDetrender);
    // const detrender = [currentDetrender].concat(acc.detrender);

    // Compute InPhase and Quadrature components
    const currentQ1 = compute(vars.dt, vars.p[0]);
    vars.q1.unshift(currentQ1);
    // const q1 = [currentQ1].concat(acc.q1);

    const currentI1 = nz(vars.dt[3]);
    vars.i1.unshift(currentI1);
    // const i1 = [currentI1].concat(acc.i1);

    // Advance the phase of I1 and Q1 by 90 degrees
    const currentJi = compute(vars.i1, vars.p[0]);
    vars.jI.unshift(currentJi);
    // const jI = [currentJi].concat(acc.jI);

    const currentJq = compute(vars.q1, vars.p[0]);
    vars.jQ.unshift(currentJq);
    // const jQ = [currentJq].concat(acc.jQ);

    // Phasor addition for 3 bar averaging
    const currentI2 = currentI1 - currentJq;
    // vars.i2.unshift(currentI2);
    // const i2 = [currentI2].concat(acc.i2);
    const currentQ2 = currentQ1 + currentJi;
    // vars.q2.unshift(currentQ2);
    // const q2 = [currentQ2].concat(acc.q2);

    // Smooth the I and Q components before applying the discriminator
    const smoothedI2 = 0.2 * currentI2 + 0.8 * nz(vars.i2[0]); //0
    vars.i2.unshift(smoothedI2);

    const smoothedQ2 = 0.2 * currentQ2 + 0.8 * nz(vars.q2[0]); //0
    vars.q2.unshift(smoothedQ2);

    // Homodyne Discriminator
    const re_ = smoothedI2 * nz(vars.i2[1]) + smoothedQ2 * nz(vars.q2[1]);
    const im_ = smoothedI2 * nz(vars.q2[1]) - smoothedQ2 * nz(vars.i2[1]);

    const re = 0.2 * re_ + 0.8 * nz(vars.re[0]); //0
    const im = 0.2 * im_ + 0.8 * nz(vars.im[0]); //0

    vars.re.unshift(re);
    vars.im.unshift(im);

    let p1 = 0;

    if (im !== 0 && re !== 0) {
      p1 = (2 * Math.PI) / Math.atan(im / re);
    } else {
      p1 = nz(vars.p[0]);
    }

    vars.p1.unshift(p1);

    let p2 = 0;

    if (p1 > 1.5 * nz(vars.p1[1])) {
      p2 = 1.5 * nz(vars.p1[1]);
    } else if (p1 < 0.67 * nz(vars.p1[1])) {
      p2 = 0.67 * nz(vars.p1[1]);
    } else {
      p2 = p1;
    }

    vars.p2.unshift(p2);

    let p3 = 0;

    if (p2 < 6) {
      p3 = 6;
    } else if (p2 > 50) {
      p3 = 50;
    } else {
      p3 = p2;
    }

    vars.p3.unshift(p3);

    const period = 0.2 * p3 + 0.8 * nz(vars.p3[1]);
    const smoothPeriod = 0.33 * period + 0.67 * nz(vars.spp[0]);

    vars.p.unshift(period);
    vars.spp.unshift(smoothPeriod);

    const phase = (180 / Math.PI) * Math.atan(currentQ1 / currentI1);
    vars.phase.unshift(phase);

    let deltaPhase = nz(vars.phase[1]) - phase;

    if (deltaPhase < 1) {
      deltaPhase = 1;
    }

    vars.dphase.unshift(deltaPhase);

    let alpha = fl / deltaPhase;

    if (alpha < sl) {
      alpha = sl;
    } else if (alpha > fl) {
      alpha = fl;
    }

    vars.alpha.unshift(alpha);

    const mama = alpha * current + (1 - alpha) * nz(vars.mama[0]);
    const fama = 0.5 * alpha * mama + (1 - 0.5 * alpha) * nz(vars.fama[0]);

    vars.mama.unshift(mama);
    vars.fama.unshift(fama);
  });

  return {
    mama: nz(vars.mama[0]),
    fama: nz(vars.fama[0]),
  };
};
