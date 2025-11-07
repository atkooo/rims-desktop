<template>
    <div class="page">
        <header class="page-header">
            <h1>Kategori</h1>
            <button class="btn primary" @click="openCreateDialog">
                <i class="fas fa-plus"></i> Tambah Kategori
            </button>
        </header>

        <!-- Tabel Kategori -->
        <div class="card">
            <table class="table">
                <thead>
                    <tr>
                        <th>Nama</th>
                        <th>Deskripsi</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="category in categories" :key="category.id">
                        <td>{{ category.name }}</td>
                        <td>{{ category.description }}</td>
                        <td>
                            <button class="btn icon" @click="editCategory(category)">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn icon" @click="confirmDelete(category)">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Dialog Form -->
        <Dialog v-if="showDialog" :title="isEdit ? 'Edit Kategori' : 'Tambah Kategori'" @close="closeDialog">
            <form @submit.prevent="saveCategory">
                <div class="form-group">
                    <label>Nama Kategori</label>
                    <input v-model="form.name" type="text" required />
                </div>

                <div class="form-group">
                    <label>Deskripsi</label>
                    <textarea v-model="form.description" rows="3"></textarea>
                </div>

                <div class="dialog-footer">
                    <button type="button" class="btn" @click="closeDialog">Batal</button>
                    <button type="submit" class="btn primary">
                        {{ isEdit ? 'Simpan' : 'Tambah' }}
                    </button>
                </div>
            </form>
        </Dialog>

        <!-- Dialog Konfirmasi Hapus -->
        <Dialog v-if="showDeleteDialog" title="Hapus Kategori" @close="closeDeleteDialog">
            <p>Yakin ingin menghapus kategori ini?</p>
            <div class="dialog-footer">
                <button class="btn" @click="closeDeleteDialog">Batal</button>
                <button class="btn danger" @click="deleteCategory">Hapus</button>
            </div>
        </Dialog>
    </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import Dialog from '@/components/Dialog.vue'

export default {
    components: { Dialog },

    setup() {
        const categories = ref([])
        const showDialog = ref(false)
        const showDeleteDialog = ref(false)
        const selectedCategory = ref(null)
        const isEdit = ref(false)

        const form = ref({
            name: '',
            description: ''
        })

        // Load data
        async function loadCategories() {
            try {
                categories.value = await window.api.invoke('categories:getAll')
            } catch (error) {
                alert('Gagal memuat data kategori')
                console.error(error)
            }
        }

        // Dialog handlers
        function openCreateDialog() {
            form.value = { name: '', description: '' }
            isEdit.value = false
            showDialog.value = true
        }

        function editCategory(category) {
            selectedCategory.value = category
            form.value = { ...category }
            isEdit.value = true
            showDialog.value = true
        }

        function closeDialog() {
            showDialog.value = false
            form.value = { name: '', description: '' }
            selectedCategory.value = null
        }

        function confirmDelete(category) {
            selectedCategory.value = category
            showDeleteDialog.value = true
        }

        function closeDeleteDialog() {
            showDeleteDialog.value = false
            selectedCategory.value = null
        }

        // CRUD operations
        async function saveCategory() {
            try {
                if (isEdit.value) {
                    await window.api.invoke('categories:update', {
                        id: selectedCategory.value.id,
                        ...form.value
                    })
                } else {
                    await window.api.invoke('categories:create', form.value)
                }

                closeDialog()
                loadCategories()
            } catch (error) {
                alert('Gagal menyimpan kategori')
                console.error(error)
            }
        }

        async function deleteCategory() {
            try {
                await window.api.invoke('categories:delete', selectedCategory.value.id)
                closeDeleteDialog()
                loadCategories()
            } catch (error) {
                alert('Gagal menghapus kategori')
                console.error(error)
            }
        }

        onMounted(loadCategories)

        return {
            // Data
            categories,
            form,
            showDialog,
            showDeleteDialog,
            isEdit,

            // Methods
            openCreateDialog,
            editCategory,
            closeDialog,
            confirmDelete,
            closeDeleteDialog,
            saveCategory,
            deleteCategory
        }
    }
}
</script>

<style scoped>
.page {
    padding: 20px;
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.card {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    padding: 20px;
}

.table {
    width: 100%;
    border-collapse: collapse;
}

.table th,
.table td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #eee;
}

.form-group {
    margin-bottom: 15px;
}

.form-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: 500;
}

.form-group input,
.form-group textarea {
    width: 100%;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
}

.btn {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    background: #e9ecef;
}

.btn.primary {
    background: #007bff;
    color: white;
}

.btn.danger {
    background: #dc3545;
    color: white;
}

.btn.icon {
    padding: 6px;
    margin: 0 4px;
    background: none;
}

.btn.icon:hover {
    color: #007bff;
}
</style>