import {
  basicInsertConflict,
  insertAtDifferentPositions,
  concurrentDeleteAndInsert,
  formatConflict,
  deleteConflict,
  samePositionDeleteConflict,
  complexInsertConflict,
  insertAndDeleteOverlap,
  formatAndContentConflict,
  multipleFormatConflict,
  attributeConflictStrategy,
  sequentialOperations,
  boundaryOperations,
  largeTextOperations,
  formatRemovalConflict,
  mixedOperations,
  networkLatencySimulation,
  multipleUserConflict,
  rapidSuccessiveOperations,
  rapidSuccessiveOperationsAdvanced,
  extremeRapidSuccessiveOperations,
  complexFormatMerging,
  partialFormatConflict,
  insertWithFormatConflict,
  deleteAcrossFormattedText,
  retainZeroEdgeCases,
  emptyDocumentOperations,
  longTextWithFormatting,
  formatRemovalAndAddition,
  stressTest,
  realWorldScenario,
  edgeCaseOperations,
  formatInheritanceTest,
  concurrentFormatRemoval,
  query1,
  query2,
  query3,
} from "../collab/testCases";
import { simpleTest, simpleTwoUserTest } from "../collab/testCases";

// 测试用例配置
export const testCaseConfig = {
  simpleTest,
  simpleTwoUserTest,
  basicInsertConflict,
  insertAtDifferentPositions,
  concurrentDeleteAndInsert,
  formatConflict,
  deleteConflict,
  samePositionDeleteConflict,
  complexInsertConflict,
  insertAndDeleteOverlap,
  formatAndContentConflict,
  multipleFormatConflict,
  attributeConflictStrategy,
  sequentialOperations,
  boundaryOperations,
  largeTextOperations,
  formatRemovalConflict,
  mixedOperations,
  networkLatencySimulation,
  multipleUserConflict,
  rapidSuccessiveOperations,
  rapidSuccessiveOperationsAdvanced,
  extremeRapidSuccessiveOperations,
  complexFormatMerging,
  partialFormatConflict,
  insertWithFormatConflict,
  deleteAcrossFormattedText,
  retainZeroEdgeCases,
  emptyDocumentOperations,
  longTextWithFormatting,
  formatRemovalAndAddition,
  stressTest,
  realWorldScenario,
  edgeCaseOperations,
  formatInheritanceTest,
  concurrentFormatRemoval,
  query1,
  query2,
  query3,
};

export default testCaseConfig;
