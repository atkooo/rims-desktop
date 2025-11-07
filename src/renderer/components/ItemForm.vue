<template>
    <AppDialog v-model="showDialog" :title="isEdit ? 'Edit Item' : 'Item Baru'"
        :confirm-text="isEdit ? 'Update' : 'Simpan'" :loading="loading" @confirm="handleSubmit">
        <form @submit.prevent="handleSubmit" class="item-form">
            <!-- Basic Info -->
            <div class="form-section">
                <FormInput id="name" label="Nama Item" v-model="form.name" :error="errors.name" required />

                <div class="form-row">
                    <FormInput id="price" label="Harga" type="number" v-model.number="form.price" :error="errors.price"
                        required />

                    <div class="form-group">
                        <label class="form-label">Tipe Item</label>
                        <select v-model="form.type" class="form-select">
                            <option v-for="type in ITEM_TYPE" :key="type" :value="type">
                                {{ type }}
                            </option>
                        </select>
                        <div v-if="errors.type" class="error-message">
                            {{ errors.type }}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Additional Info -->
            <div class="form-section">
                <FormInput id="description" label="Deskripsi" v-model="form.description" type="textarea" />

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Status</label>
                        <select v-model="form.status" class="form-select">
                            <option value="AVAILABLE">Available</option>
                            <option value="RENTED">Rented</option>
                            <option value="MAINTENANCE">Maintenance</option>
                        </select>
                    </div>

                    <FormInput id="code" label="Kode Item" v-model="form.code" :error="errors.code" />
                </div>
            </div>

            <!-- Rental Info (if type is RENTAL) -->
            <div v-if="form.type === 'RENTAL'" class="form-section">
                <h3>Informasi Rental</h3>
                <div class="form-row">
                    <FormInput id="dailyRate" label="Harga per Hari" type="number" v-model.number="form.dailyRate"
                        :error="errors.dailyRate" />

                    <FormInput id="weeklyRate" label="Harga per Minggu" type="number" v-model.number="form.weeklyRate"
                        :error="errors.weeklyRate" />
                </div>

                <FormInput id="deposit" label="Deposit" type="number" v-model.number="form.deposit"
                    :error="errors.deposit" />
            </div>
        </form>
    </AppDialog>
</template>

<script>
import { ref, computed, watch } from 'vue'
import { useItemStore } from '../store/items'
import { ITEM_TYPE } from '../../shared/constants'
import AppDialog from './AppDialog.vue'
import FormInput from './FormInput.vue'

export default {
    name: 'ItemForm',
    components: {
        AppDialog,
        FormInput
    },

    props: {
        modelValue: Boolean,
        editData: {
            type: Object,
            default: null
        }
    },

    emits: ['update:modelValue', 'saved'],

    setup(props, { emit }) {
        const itemStore = useItemStore()
        const loading = ref(false)
        const errors = ref({})

        // Form state
        const form = ref({
            name: '',
            price: 0,
            type: 'RENTAL',
            description: '',
            status: 'AVAILABLE',
            code: '',
            dailyRate: 0,
            weeklyRate: 0,
            deposit: 0
        })

        // Computed
        const isEdit = computed(() => !!props.editData)
        const showDialog = computed({
            get: () => props.modelValue,
            set: (value) => emit('update:modelValue', value)
        })

        // Methods
        const validateForm = () => {
            const newErrors = {}

            if (!form.value.name.trim()) {
                newErrors.name = 'Nama item harus diisi'
            }

            if (!form.value.price || form.value.price <= 0) {
                newErrors.price = 'Harga harus lebih dari 0'
            }

            if (form.value.type === 'RENTAL') {
                if (!form.value.dailyRate || form.value.dailyRate <= 0) {
                    newErrors.dailyRate = 'Harga per hari harus lebih dari 0'
                }
                if (!form.value.deposit || form.value.deposit <= 0) {
                    newErrors.deposit = 'Deposit harus lebih dari 0'
                }
            }

            errors.value = newErrors
            return Object.keys(newErrors).length === 0
        }

        const handleSubmit = async () => {
            if (!validateForm()) return

            loading.value = true
            try {
                if (isEdit.value) {
                    await itemStore.updateItem(props.editData.id, form.value)
                } else {
                    await itemStore.addItem(form.value)
                }

                emit('saved')
                showDialog.value = false
            } catch (error) {
                console.error('Error saving item:', error)
            } finally {
                loading.value = false
            }
        }

        // Reset form when dialog opens
        const resetForm = () => {
            if (props.editData) {
                form.value = { ...props.editData }
            } else {
                form.value = {
                    name: '',
                    price: 0,
                    type: 'RENTAL',
                    description: '',
                    status: 'AVAILABLE',
                    code: '',
                    dailyRate: 0,
                    weeklyRate: 0,
                    deposit: 0
                }
            }
            errors.value = {}
        }

        // Watch for dialog opening
        watch(() => props.modelValue, (newVal) => {
            if (newVal) resetForm()
        })

        return {
            form,
            errors,
            loading,
            isEdit,
            showDialog,
            ITEM_TYPE,
            handleSubmit
        }
    }
}
</script>

<style scoped>
.item-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.form-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.form-label {
    font-weight: 500;
}

.form-select {
    padding: 0.5rem;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    font-size: 1rem;
}

.error-message {
    color: #dc2626;
    font-size: 0.875rem;
}

h3 {
    margin: 0;
    font-size: 1.1rem;
    color: #374151;
}
</style>
