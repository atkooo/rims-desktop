import { ipcRenderer } from "@/services/ipc";

// Accessories
export function fetchAccessories() {
  return ipcRenderer.invoke("master:getAccessories");
}

export function createAccessory(payload) {
  return ipcRenderer.invoke("accessories:create", payload);
}

export function updateAccessory(id, payload) {
  return ipcRenderer.invoke("accessories:update", id, payload);
}

export function deleteAccessory(id) {
  return ipcRenderer.invoke("accessories:delete", id);
}

export function fetchAccessoryById(id) {
  return ipcRenderer.invoke("accessories:getById", id);
}

export function fetchAccessoryByCode(code) {
  return ipcRenderer.invoke("accessories:getByCode", code);
}

export function fetchBundles() {
  return ipcRenderer.invoke("master:getBundles");
}

export function createBundle(payload) {
  return ipcRenderer.invoke("bundles:create", payload);
}

export function updateBundle(id, payload) {
  return ipcRenderer.invoke("bundles:update", id, payload);
}

export function deleteBundle(id) {
  return ipcRenderer.invoke("bundles:delete", id);
}

export function fetchBundleDetails() {
  return ipcRenderer.invoke("master:getBundleDetails");
}

export function fetchBundleById(id) {
  return ipcRenderer.invoke("bundles:getById", id);
}

export function fetchBundleByCode(code) {
  return ipcRenderer.invoke("bundles:getByCode", code);
}

export function fetchBundleDetailsByBundle(bundleId) {
  return ipcRenderer.invoke("bundleDetails:getByBundle", bundleId);
}

export function createBundleDetail(payload) {
  return ipcRenderer.invoke("bundleDetails:create", payload);
}

export function updateBundleDetail(id, payload) {
  return ipcRenderer.invoke("bundleDetails:update", id, payload);
}

export function deleteBundleDetail(id) {
  return ipcRenderer.invoke("bundleDetails:delete", id);
}

export function fetchCustomers() {
  return ipcRenderer.invoke("master:getCustomers");
}

export function createCustomer(payload) {
  return ipcRenderer.invoke("customers:create", payload);
}

export function updateCustomer(id, payload, options = {}) {
  return ipcRenderer.invoke("customers:update", id, payload, options);
}

export function deleteCustomer(id) {
  return ipcRenderer.invoke("customers:delete", id);
}

export function fetchCustomerById(id) {
  return ipcRenderer.invoke("customers:getById", id);
}

export function fetchCustomerDocument(path) {
  return ipcRenderer.invoke("customers:getDocument", path);
}

export function fetchRoles() {
  return ipcRenderer.invoke("roles:getAll");
}

export function fetchRoleById(id) {
  return ipcRenderer.invoke("roles:getById", id);
}

export function createRole(payload) {
  return ipcRenderer.invoke("roles:create", payload);
}

export function updateRole(id, payload) {
  return ipcRenderer.invoke("roles:update", id, payload);
}

export function deleteRole(id) {
  return ipcRenderer.invoke("roles:delete", id);
}

export function fetchPermissions() {
  return ipcRenderer.invoke("permissions:getAll");
}

export function fetchPermissionsByModule(module) {
  return ipcRenderer.invoke("permissions:getByModule", module);
}

export function fetchPermissionById(id) {
  return ipcRenderer.invoke("permissions:getById", id);
}

export function fetchRolePermissions(roleId) {
  return ipcRenderer.invoke("roles:getPermissions", roleId);
}

export function updateRolePermissions(roleId, permissionIds) {
  return ipcRenderer.invoke("roles:updatePermissions", roleId, permissionIds);
}

export function fetchUsers() {
  return ipcRenderer.invoke("master:getUsers");
}

export function fetchUserById(id) {
  return ipcRenderer.invoke("users:getById", id);
}

export function createUser(payload) {
  return ipcRenderer.invoke("users:create", payload);
}

export function updateUser(id, payload) {
  return ipcRenderer.invoke("users:update", id, payload);
}

export function updateOwnProfile(payload) {
  return ipcRenderer.invoke("users:updateOwnProfile", payload);
}

export function deleteUser(id) {
  return ipcRenderer.invoke("users:delete", id);
}

export function fetchItemSizes() {
  return ipcRenderer.invoke("itemSizes:getAll");
}

export function fetchItemById(id) {
  return ipcRenderer.invoke("items:getById", id);
}

export function fetchDiscountGroups() {
  return ipcRenderer.invoke("master:getDiscountGroups");
}

export function createDiscountGroup(payload) {
  return ipcRenderer.invoke("discountGroups:create", payload);
}

export function updateDiscountGroup(id, payload) {
  return ipcRenderer.invoke("discountGroups:update", id, payload);
}

export function deleteDiscountGroup(id) {
  return ipcRenderer.invoke("discountGroups:delete", id);
}

export function fetchDiscountGroupById(id) {
  return ipcRenderer.invoke("discountGroups:getById", id);
}
