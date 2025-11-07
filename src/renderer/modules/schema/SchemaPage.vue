<template>
  <div class="schema-page">
    <h1>{{ heading }}</h1>
    <p v-if="schema?.description" class="schema-description">{{ schema.description }}</p>

    <div v-if="schema" class="schema-card">
      <div class="schema-meta">
        <span class="schema-chip">{{ schema.kind === 'view' ? 'View' : 'Table' }}</span>
        <span class="schema-name">{{ schema.table }}</span>
        <span class="schema-group">{{ schema.group }}</span>
      </div>
      <ul class="schema-fields">
        <li v-for="field in schema.fields" :key="field.name">
          <strong>{{ field.name }}</strong>
          <span class="type">{{ field.type }}</span>
          <span v-if="field.notes" class="notes">— {{ field.notes }}</span>
        </li>
      </ul>
      <div v-if="schema.notes?.length" class="schema-notes">
        <h2>Catatan</h2>
        <ul>
          <li v-for="note in schema.notes" :key="note">{{ note }}</li>
        </ul>
      </div>
    </div>

    <div v-else class="schema-empty">
      <p>Schema tidak ditemukan.</p>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';
import { getSchemaDefinition } from './definitions.js';

export default {
  name: 'SchemaPage',
  props: {
    schemaKey: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const schema = computed(() => getSchemaDefinition(props.schemaKey));
    const heading = computed(() => schema.value ? `${schema.value.group} · ${schema.value.title}` : 'Schema Tidak Ditemukan');

    return {
      schema,
      heading
    };
  }
};
</script>

<style scoped>
.schema-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.schema-description {
  color: #475569;
  margin: 0;
}

.schema-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.schema-meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
  color: #475569;
}

.schema-chip {
  background: #e0e7ff;
  color: #3730a3;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.schema-name {
  font-weight: 600;
}

.schema-group {
  color: #64748b;
}

.schema-fields {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.schema-fields li {
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: baseline;
}

.schema-fields .type {
  color: #0f172a;
}

.schema-fields .notes {
  color: #475569;
}

.schema-notes h2 {
  margin: 0 0 8px;
  font-size: 16px;
}

.schema-notes ul {
  list-style: disc;
  padding-left: 20px;
  margin: 0;
  color: #475569;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.schema-empty {
  padding: 24px;
  border: 1px dashed #cbd5f5;
  border-radius: 10px;
  text-align: center;
  color: #475569;
}
</style>

