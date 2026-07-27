import type { z } from "zod"

import {
  EvaluationDto,
  ReportSectionDto,
  SECTION_KEYS,
  SECTION_SCHEMAS,
  type SectionDataByKey,
  type SectionKey,
} from "@/lib/contract"

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? (<T>() => T extends B ? 1 : 2) extends <T>() => T extends A ? 1 : 2
      ? true
      : false
    : false

type Assert<T extends true> = T

export type ContractSmokeAssertions = [
  Assert<Equal<keyof typeof SECTION_SCHEMAS, SectionKey>>,
  Assert<Equal<keyof SectionDataByKey, SectionKey>>,
  Assert<typeof EvaluationDto extends z.ZodType ? true : false>,
  Assert<typeof ReportSectionDto extends z.ZodType ? true : false>,
]

export const CONTRACT_SMOKE_CHECK = {
  sectionCount: SECTION_KEYS.length,
  sectionSchemaCount: Object.keys(SECTION_SCHEMAS).length,
}
