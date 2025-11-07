import SchemaPage from '../schema/SchemaPage.vue';

export const settingsRoutes = [
  {
    path: '/settings/system',
    name: 'settings-system',
    component: SchemaPage,
    props: { schemaKey: 'system_settings' },
    meta: { title: 'Pengaturan Sistem', group: 'settings' }
  },
  {
    path: '/settings/backup-history',
    name: 'settings-backup-history',
    component: SchemaPage,
    props: { schemaKey: 'backup_history' },
    meta: { title: 'Riwayat Backup', group: 'settings' }
  },
  {
    path: '/settings/activity-logs',
    name: 'settings-activity-logs',
    component: SchemaPage,
    props: { schemaKey: 'activity_logs' },
    meta: { title: 'Log Aktivitas', group: 'settings' }
  }
];

export default settingsRoutes;

