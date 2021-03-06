<template>
  <div
    class="card course-card"
    :class="{
      hidden:
        areThereMissingPrerequisites === 2 &&
        hidePrerequisitesState &&
        prerequisiteCheckingState &&
        areThereSelectedSections === 0,
    }"
  >
    <!-- header -->
    <div
      class="card-header course-card-header"
      v-on:click="toggleExpanded()"
      v-on:keyup.enter="toggleExpanded()"
      tabindex="0"
    >
      <div style="display: flex;">
        <span style="float: left; flex-grow: 2;">
          <font-awesome-icon
            :icon="['fas', 'caret-right']"
            class="open_close_icon"
            :class="{ opened_icon: expanded }"
          ></font-awesome-icon>

          <span class="font-weight-bold">
            <span class="course-code">{{ course.subj }}-{{ course.crse }}</span>
            {{ course.title }}</span
          >
          ꞏ {{ credMin }} credit<template v-if="credMin !== '1'">s</template>
          {{ attributes }}
        </span>
        <!--
        This code should be left here in case we ever need to add a more info button to a course
        <font-awesome-icon
          :icon="['fas', 'info-circle']"
          class="open_close_icon info-icon"
          title="More info"
        ></font-awesome-icon> -->
      </div>
      <div>
        <span
          v-if="prerequisiteCheckingState && areThereMissingPrerequisites"
          v-on:click.stop.prevent
          v-on:keyup.enter.stop.prevent
          tabindex="0"
          @click="$bvModal.show('course-info' + course.sections[0].crn)"
          @keyup.enter="$bvModal.show('course-info' + course.sections[0].crn)"
        >
          <CourseInfo class="more-info" :course="course"></CourseInfo>
          <span
            class="padding-left prerequisiteError"
            title="Expand sections for more details"
          >
            <font-awesome-icon
              :icon="['fas', 'exclamation-triangle']"
            ></font-awesome-icon>
            Missing prerequisites<template
              v-if="areThereMissingPrerequisites === 1"
            >
              for some sections</template
            ></span
          >
        </span>
        <span v-if="fullSections">
          <span
            class="padding-left prerequisiteError"
            title="Expand sections for more details"
          >
            <font-awesome-icon
              :icon="['fas', 'user-slash']"
            ></font-awesome-icon>
            <template v-if="fullSections === 2">Full Course</template>
            <template v-else>Full Sections</template></span
          >
        </span>
      </div>
      <!-- <br> -->
      {{ getDescription(course.subj, course.crse) }}
    </div>

    <div :id="'section-grow-' + course.id" class="section-grow">
      <div :id="'measuringWrapper-' + course.id">
        <div
          class="card-body"
          :class="{ expanded: expanded }"
          :key="course.id + lastNewSchedule"
        >
          <Sections v-bind:course="course" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { mapGetters, mapState } from "vuex";
import { ModalPlugin } from "bootstrap-vue";
import { Course } from "@/typings";
import { hasMetAllPrerequisites } from "@/utilities";
import CourseInfo from "@/components/sections/CourseInfo.vue";

import Sections from "./sections/Sections.vue";

Vue.use(ModalPlugin);

@Component({
  components: {
    Sections,
    CourseInfo,
  },
  computed: {
    hasMetAllPrerequisites,
    ...mapGetters("prerequisites", ["prerequisiteCheckingState"]),
    ...mapGetters("settings", ["hidePrerequisitesState"]),
    ...mapState("schedule", ["courseSets", "currentTerm", "currentCourseSet"]),
    areThereMissingPrerequisites: function (): number {
      let missingCount = 0;
      // @ts-expect-error: no u typescript, this does exist
      for (const section of this.course.sections) {
        // @ts-expect-error: no u typescript, this does exist
        if (!this.hasMetAllPrerequisites(section.crn)) {
          missingCount++;
        }
      }
      //2==missing all section prerequisites, 1==missing some sections, 0==not missing any prerequisites
      return (
        // @ts-expect-error: no u typescript, this does exist
        (missingCount === this.course.sections.length) + (missingCount > 0)
      );
    },
    fullSections: function () {
      let emptyCount = 0;
      // @ts-expect-error: no u typescript, this does exist
      for (const section of this.course.sections) {
        if (
          this.$store.state.courseSizes[section.crn] &&
          this.$store.state.courseSizes[section.crn].avail <= 0
        ) {
          emptyCount++;
        }
      }
      //2==all sections full, 1==some sections full, 0==not sections full
      // @ts-expect-error: no u typescript, this does exist
      return (emptyCount === this.course.sections.length) + (emptyCount > 0);
    },
    areThereSelectedSections: function () {
      let selectedCount = 0;
      // @ts-expect-error: no u typescript, this does exist
      for (const section of this.course.sections) {
        if (
          // @ts-expect-error: This is mapped in the custom computed section
          this.courseSets[this.currentTerm][this.currentCourseSet][section.crn]
        ) {
          selectedCount++;
        }
      }
      //2==all sections selected, 1==some sections selected, 0==no sections selected
      return (
        // @ts-expect-error: no u typescript, this does exist
        (selectedCount === this.course.sections.length) + (selectedCount > 0)
      );
    },
  },
})
export default class CourseCard extends Vue {
  @Prop() readonly course!: Course;
  @Prop() readonly startExpanded!: boolean;
  expanded = this.startExpanded ? this.startExpanded : false;

  get credMin() {
    return (
      this.course.sections[0].credMin +
      (this.course.sections[0].credMin !== this.course.sections[0].credMax
        ? "-" + this.course.sections[0].credMax
        : "")
    );
  }

  get attributes() {
    return this.course.sections[0].attribute === ""
      ? ""
      : "ꞏ " + this.course.sections[0].attribute;
  }

  getDescription(subject: string, code: string): string {
    const catname = subject + "-" + code;
    if (catname in this.$store.state.catalog) {
      return this.$store.state.catalog[catname].description;
    }

    return "";
  }

  get rotation() {
    if (this.expanded) {
      return 90;
    } else {
      return 0;
    }
  }

  toggleExpanded() {
    this.expanded = !this.expanded;
    const growDiv = document.getElementById("section-grow-" + this.course.id);
    if (growDiv) {
      if (!this.expanded) {
        growDiv.style.height = "0";
      } else {
        const measuringWrapper = document.getElementById(
          "measuringWrapper-" + this.course.id
        );
        if (measuringWrapper) {
          growDiv.style.height = measuringWrapper.clientHeight + "px";
        }
      }
    }
  }

  get lastNewSchedule() {
    return this.$store.state.schedule.lastNewSchedule;
  }
}
</script>

<style scoped>
.open_close_icon {
  transition: 0.5s;
}

.section-grow {
  transition: height 0.5s;
  height: 0;
  overflow: hidden;
}

.opened_icon {
  transform: rotate(90deg);
}

.card-body {
  padding: 0px;
}

.expanded {
  max-height: 9999px;
}

.course-card {
  margin-bottom: 0.75rem;
}

.course-card-header {
  cursor: pointer;
}

.card-header:hover {
  background: var(--card-header-hover);
}

.course-code {
  font-family: monospace;
  font-size: 1.5rem;
  margin-left: 0.3rem;
}

.info-icon {
  transition: all 0.2s ease-in-out;
  float: right;
  font-size: 3rem;
}
.info-icon:hover {
  transform: scale(1.5);
}

@media (min-width: 992px) {
  .info-icon {
    font-size: 2rem;
  }
}

.prerequisiteError {
  background: var(--prerequisite-error-icon);
  color: var(--prerequisite-text);
  margin: 0px 0.3rem;
  padding: 0.2rem 0.4rem;
}

.hidden {
  display: none;
}
</style>
