import { Action, Module, Mutation, VuexModule } from "vuex-module-decorators";
import { Course, CourseSection, Department } from "@/typings";
import Vue from "vue";

@Module({ namespaced: true })
export default class Sections extends VuexModule {
  selectedSections: { [crn: string]: boolean } = {};
  conflictingSections: { [crn: string]: boolean } = {};
  crnToSections: { [crn: string]: { course: Course; sec: CourseSection } } = {};
  courseIdToCourse: { [id: string]: { course: Course } } = {};

  CURRENT_STORAGE_VERSION = "0.0.2";
  storedVersion = ""; // If a value is in localstorage, this will be set to that on load

  currentSchedules: Uint32Array = new Uint32Array();
  numCoursesInSchedule = 0;
  numConflicts = 0;

  wasm: typeof import("@/quacs-rs") | null = null;

  get isSelected(): (crn: string) => boolean {
    return (crn: string) => this.selectedSections[crn] === true;
  }

  get isInitialized(): (crn: string) => boolean {
    return (crn: string) => crn in this.selectedSections;
  }

  get isInConflict(): (crn: string) => boolean {
    return (crn: string) => this.conflictingSections[crn];
  }

  get selectedCRNs(): readonly string[] {
    return Object.keys(this.selectedSections).filter(
      (crn: string) => this.selectedSections[(crn as unknown) as number]
    );
  }

  get scheduleCRNs() {
    return (scheduleNum: number) => {
      const scheduleStart =
        2 + this.numConflicts + scheduleNum * this.numCoursesInSchedule;

      return this.currentSchedules.subarray(
        scheduleStart,
        scheduleStart + this.numCoursesInSchedule
      );
    };
  }

  get crnToCourseAndSection(): (
    crn: number
  ) => { course: Course; sec: CourseSection } {
    return (crn: number) => this.crnToSections[crn];
  }

  get numSchedules(): number {
    if (this.numCoursesInSchedule === 0) {
      return 0;
    }

    return (
      (this.currentSchedules.length - 2 - this.numConflicts) /
      this.numCoursesInSchedule
    );
  }

  @Mutation
  setSelected(p: { crn: number; state: boolean }): void {
    Vue.set(this.selectedSections, p.crn, p.state);
  }

  @Mutation
  initializeDataMappings(departments: readonly Department[]): void {
    if (Object.keys(this.crnToSections).length === 0) {
      for (const dept of departments) {
        for (const course of dept.courses) {
          Vue.set(this.courseIdToCourse, course.id, course);
          for (const section of course.sections) {
            Vue.set(this.crnToSections, section.crn, {
              course,
              sec: section,
            });
          }
        }
      }
    }
  }

  @Mutation
  initializeStore(): void {
    if (this.storedVersion !== this.CURRENT_STORAGE_VERSION) {
      // eslint-disable-next-line
      console.log("Out of date or uninitialized sections, clearing");

      this.storedVersion = this.CURRENT_STORAGE_VERSION;
      this.selectedSections = {};
    }
  }

  @Mutation
  generateSchedulesAndConflicts(): void {
    if (this.wasm === null) {
      return;
    }

    const slimCrnToSections: {
      [crn: string]: { course: string; conflicts: number[] };
    } = {};

    for (const crn in this.selectedSections) {
      slimCrnToSections[crn] = {
        course: this.crnToSections[crn].course.id,
        conflicts: Object.keys(
          this.crnToSections[crn].sec.conflicts
        ).map((secCrn) => parseInt(secCrn)),
      };
    }

    this.currentSchedules = this.wasm.generateCurrentSchedulesAndConflicts(
      this.selectedSections,
      slimCrnToSections
    );

    this.numCoursesInSchedule = this.currentSchedules[0];
    this.numConflicts = this.currentSchedules[1];

    this.conflictingSections = {};
    for (let i = 2; i < 2 + this.numConflicts; i++) {
      this.conflictingSections[this.currentSchedules[i]] = true;
    }
  }

  @Mutation
  setWasm(wasm: typeof import("@/quacs-rs")) {
    this.wasm = wasm;
  }

  @Action
  async initWasm() {
    this.context.commit("setWasm", await import("@/quacs-rs"));
    this.context.commit("generateSchedulesAndConflicts");
  }
}
