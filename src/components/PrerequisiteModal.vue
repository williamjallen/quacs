<template>
  <div v-if="data">
    <b-modal id="prerequisite-modal" title="Settings">
      test
      {{ prerequisites(data.prerequisites) }}

      {{ data }}

      <template v-slot:modal-footer="{ ok }">
        <b-button variant="primary" @click="ok()">
          Close
        </b-button>
      </template>
    </b-modal>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { Prerequisite } from "@/typings";

@Component
export default class PrerequisiteModal extends Vue {
  @Prop() readonly crn!: string;
  data = this.$store.state.prerequisites[this.crn] | null;

  prerequisites(data: Prerequisite): string {
    if (Object.keys(data).length === 0) {
      return "";
    }
    let value = "";
    if (data.type === "solo" && data.solo.length > 0) {
      value += data.solo[0];
    } else {
      for (let i = 0; i < data.solo.length; i++) {
        value += data.solo[i];
        if (i < data.solo.length - 1) {
          value += " " + data.type;
        }
      }
    }
    for (const nested of data.nested) {
      value += " (" + this.prerequisites(nested) + ")";
    }
    return value;
  }
}
</script>
