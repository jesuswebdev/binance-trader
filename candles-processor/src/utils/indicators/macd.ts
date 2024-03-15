type GetMACDFunctionReturnValue = {
  macd: number | null;
  macd_signal: number | null;
  macd_histogram: number | null;
};

export function getMACD(): GetMACDFunctionReturnValue {
  return {
    macd: 0,
    macd_signal: 0,
    macd_histogram: 0,
  };
}
// export function getMACD(
//   data: [number[]],
//   { parseFn }: GetMACDOptions,
// ): GetMACDFunctionReturnValue {
//   return new Promise(function (resolve, reject) {
//     tulind.indicators.macd.indicator(
//       data,
//       [12, 26, 9],
//       function tulindMACDCallback(
//         err: unknown,
//         res: [number[], number[], number[]],
//       ) {
//         if (err) {
//           return reject(err);
//         }

//         const [macd_result, signal_result, histogram_result] = res;
//         const macd = macd_result[macd_result.length - 1] ?? null;
//         const macd_signal = signal_result[signal_result.length - 1] ?? null;
//         const macd_histogram =
//           histogram_result[histogram_result.length - 1] ?? null;

//         return resolve({
//           macd: parseFn(macd),
//           macd_signal: parseFn(macd_signal),
//           macd_histogram: parseFn(macd_histogram),
//         });
//       },
//     );
//   });
// }
