import { AddRoundCartSummary, NewOrderCartSummary } from "../CartSummary";

// Keep the existing behavioral scenarios while routing their fixtures through
// the two explicit production workflows.
export const CartSummaryFixture = (values: any) => {
  const props = {
    cart: {
      items: values.cart,
      combos: values.combos,
      menuById: values.menuById,
      totalItems: values.totalItems,
      totalPrice: values.totalPrice,
    },
    actions: {
      updateQty: values.onUpdateQty,
      updateComboQty: values.onUpdateComboQty,
      editItem: values.onEditItem,
    },
    checkout: {
      notes: values.orderNotes,
      setNotes: values.onOrderNotesChange,
      couponCode: values.couponCode,
      setCouponCode: values.onCouponCodeChange,
      promotions: values.promotions,
      selectedPromotionIds: values.selectedPromotionIds,
      togglePromotion: values.onTogglePromotion,
      isPending: values.isPending,
      submit: values.onSubmit,
      close: values.onClose,
    },
  };
  const courses = {
    available: values.courseSequencingAvailable,
    enabled: values.courseMode,
    setEnabled: values.onCourseModeChange,
  };
  return values.isAddingToExisting ? (
    <AddRoundCartSummary
      {...props}
      courses={{
        ...courses,
        roundNumber: values.roundCourseNumber,
        setRoundNumber: values.onRoundCourseNumberChange,
      }}
    />
  ) : (
    <NewOrderCartSummary
      {...props}
      courses={{
        ...courses,
        updateItem: values.onUpdateCourse,
        updateCombo: values.onUpdateComboCourse,
      }}
      needsTable={values.needsTable}
    />
  );
};
