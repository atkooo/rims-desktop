import { computed } from "vue";

export function useCashierSale(form) {
  const calculateItemPrice = (item) => {
    const basePrice = item.sale_price ?? 0;
    if (item.discount_percentage > 0) {
      return Math.round(basePrice * (1 - item.discount_percentage / 100));
    } else if (item.discount_amount > 0) {
      return Math.max(0, basePrice - item.discount_amount);
    }
    return basePrice;
  };

  const calculateBundlePrice = (bundle) => {
    const basePrice = bundle.price || 0;
    if (bundle.discount_percentage > 0) {
      return Math.round(basePrice * (1 - bundle.discount_percentage / 100));
    } else if (bundle.discount_amount > 0) {
      return Math.max(0, basePrice - bundle.discount_amount);
    }
    return basePrice;
  };

  const calculateAccessoryPrice = (accessory) => {
    const basePrice = accessory.sale_price ?? 0;
    if (accessory.discount_percentage > 0) {
      return Math.round(basePrice * (1 - accessory.discount_percentage / 100));
    } else if (accessory.discount_amount > 0) {
      return Math.max(0, basePrice - accessory.discount_amount);
    }
    return basePrice;
  };

  const baseSubtotal = computed(() =>
    form.value.items.reduce((sum, item) => {
      const price = calculateItemPrice(item);
      return sum + price * (item.quantity || 1);
    }, 0)
  );

  const bundleSubtotal = computed(() =>
    form.value.bundles.reduce((sum, bundle) => {
      const price = calculateBundlePrice(bundle);
      return sum + price * (bundle.quantity || 0);
    }, 0)
  );

  const accessorySubtotal = computed(() =>
    form.value.accessories.reduce((sum, accessory) => {
      const price = calculateAccessoryPrice(accessory);
      return sum + price * (accessory.quantity || 1);
    }, 0)
  );

  const subtotal = computed(() => baseSubtotal.value + bundleSubtotal.value + accessorySubtotal.value);

  const calculatedTax = computed(() => {
    // Tax calculation handled by parent with taxPercentage
    return 0;
  });

  const totalAmount = computed(() => {
    const discount = Number(form.value.discount) || 0;
    const tax = Number(form.value.tax) || 0;
    return subtotal.value - discount + tax;
  });

  const totalItems = computed(() =>
    form.value.items.reduce((sum, item) => sum + (item.quantity || 0), 0)
  );

  const totalBundles = computed(() =>
    form.value.bundles.reduce(
      (sum, bundle) => sum + (bundle.quantity || 0),
      0
    )
  );

  const totalAccessories = computed(() =>
    form.value.accessories.reduce(
      (sum, accessory) => sum + (accessory.quantity || 1),
      0
    )
  );

  const normalizedItems = computed(() =>
    form.value.items.map((item) => {
      const quantity = item.quantity || 1;
      const price = calculateItemPrice(item);
      return {
        itemId: item.id,
        quantity,
        rentalPrice: 0,
        salePrice: price,
        subtotal: price * quantity,
      };
    })
  );

  const normalizedBundles = computed(() =>
    form.value.bundles.map((bundle) => ({
      bundleId: bundle.id,
      quantity: Math.max(1, Number(bundle.quantity) || 1),
    }))
  );

  const normalizedAccessories = computed(() => {
    return form.value.accessories.map((accessory) => {
      const price = calculateAccessoryPrice(accessory);
      return {
        accessoryId: accessory.id,
        quantity: accessory.quantity || 1,
        salePrice: price,
        subtotal: price * (accessory.quantity || 1),
      };
    });
  });

  return {
    baseSubtotal,
    bundleSubtotal,
    accessorySubtotal,
    subtotal,
    calculatedTax,
    totalAmount,
    totalItems,
    totalBundles,
    totalAccessories,
    normalizedItems,
    normalizedBundles,
    normalizedAccessories,
    calculateItemPrice,
    calculateBundlePrice,
    calculateAccessoryPrice,
  };
}

