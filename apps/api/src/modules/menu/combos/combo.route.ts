import { Elysia, t } from "elysia";
import {
  comboListResponseSchema,
  comboPreviewResponseSchema,
  comboResponseSchema,
  nullSuccessResponseSchema,
  standardErrorResponseSchemas,
} from "@pos/contracts";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { combos, comboSlots, comboSlotOptions, orderItems } from "@/db/schema";
import { requireAuthPlugin, requirePermission } from "@/core/auth";
import { createdResponse, successResponse } from "@/core/response";
import { ValidationError, InternalError } from "@/core/errors";
import { previewComboConfiguration } from "./combo-builder.service";
import { writeAudit } from "@/core/audit";
import { itemRepository } from "@/modules/menu/items/item.repository";
import { assertMenuResourceBranch } from "@/modules/menu/menu-authorization";
import { toComboPreviewResponse, toComboResponse } from "./combo.mapper";

const body = t.Object({
  name: t.String({ minLength: 1 }),
  description: t.Optional(t.String()),
  pricePolicy: t.Union([t.Literal("FIXED"), t.Literal("PERCENT_OFF_SUM")]),
  fixedPrice: t.Optional(t.Number({ minimum: 0 })),
  percentOff: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
  slots: t.Array(
    t.Object({
      name: t.String({ minLength: 1 }),
      minSelections: t.Number({ minimum: 0 }),
      maxSelections: t.Number({ minimum: 1 }),
      options: t.Array(
        t.Object({
          menuItemId: t.String({ format: "uuid" }),
          variantId: t.Optional(t.String({ format: "uuid" })),
          upcharge: t.Optional(t.Number()),
          isUnlimitedRefill: t.Optional(t.Boolean()),
        }),
      ),
    }),
    { minItems: 1 },
  ),
});

export const combosRouter = new Elysia({ prefix: "/api/menu/combos" })
  .use(requireAuthPlugin())
  .get(
    "/",
    async ({ auth }) => {
      requirePermission(auth, "menu:read");
      return successResponse(
        (
          await db.query.combos.findMany({
            where: eq(combos.tenantId, auth.tenantId),
            with: { slots: { with: { options: true } } },
          })
        ).map(toComboResponse),
      );
    },
    {
      response: {
        200: comboListResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .post(
    "/preview",
    async ({ auth, body: input }) => {
      requirePermission(auth, "menu:pricing:write");
      if (!auth.branchId)
        throw new ValidationError("Select a branch to preview pricing");
      return successResponse(
        toComboPreviewResponse(
          await previewComboConfiguration(
            {
              tenantId: auth.tenantId,
              branchId: auth.branchId,
              channel: "STAFF",
              fulfillmentType: "DINE_IN",
              asOf: new Date(),
            },
            input,
          ),
        ),
      );
    },
    {
      body: t.Object({
        pricePolicy: t.Union([
          t.Literal("FIXED"),
          t.Literal("PERCENT_OFF_SUM"),
        ]),
        fixedPrice: t.Optional(t.Number({ minimum: 0 })),
        percentOff: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
        slots: t.Array(
          t.Object({
            name: t.String({ minLength: 1 }),
            minSelections: t.Number({ minimum: 0 }),
            maxSelections: t.Number({ minimum: 1 }),
            options: t.Array(
              t.Object({
                menuItemId: t.String({ format: "uuid" }),
                variantId: t.Optional(t.String({ format: "uuid" })),
                upcharge: t.Optional(t.Number()),
              }),
              { minItems: 1 },
            ),
          }),
          { minItems: 1 },
        ),
        selections: t.Optional(
          t.Array(
            t.Object({
              slotIndex: t.Integer({ minimum: 0 }),
              optionIndexes: t.Array(t.Integer({ minimum: 0 })),
            }),
          ),
        ),
      }),
      response: {
        200: comboPreviewResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .post(
    "/",
    async ({ auth, body: input, set }) => {
      requirePermission(auth, "menu:create");
      set.status = 201;
      if (input.pricePolicy === "FIXED" && input.fixedPrice == null)
        throw new ValidationError("A fixed combo price is required");
      if (input.pricePolicy === "PERCENT_OFF_SUM" && input.percentOff == null)
        throw new ValidationError("A percent-off value is required");
      for (const slot of input.slots) {
        if (slot.minSelections > slot.maxSelections)
          throw new ValidationError(
            `${slot.name} has invalid selection limits`,
          );
        if (slot.options.length < slot.minSelections)
          throw new ValidationError(
            `${slot.name} does not have enough options`,
          );
        for (const option of slot.options) {
          const item = await itemRepository.findById(
            auth.tenantId,
            option.menuItemId,
          );
          if (!item)
            throw new ValidationError("Combo option menu item not found");
          assertMenuResourceBranch(auth, item.branchId, { allowShared: true });
          if (
            option.variantId &&
            !item.variants.some((variant) => variant.id === option.variantId)
          )
            throw new ValidationError(
              "Combo option variant does not belong to the selected item",
            );
        }
      }
      const created = await db.transaction(async (tx) => {
        const [combo] = await tx
          .insert(combos)
          .values({
            tenantId: auth.tenantId,
            name: input.name,
            description: input.description ?? null,
            pricePolicy: input.pricePolicy,
            fixedPrice:
              input.fixedPrice == null ? null : String(input.fixedPrice),
            percentOff:
              input.percentOff == null ? null : String(input.percentOff),
          })
          .returning();
        for (let index = 0; index < input.slots.length; index++) {
          const slotInput = input.slots[index]!;
          const [slot] = await tx
            .insert(comboSlots)
            .values({
              comboId: combo!.id,
              name: slotInput.name,
              minSelections: slotInput.minSelections,
              maxSelections: slotInput.maxSelections,
              sortOrder: index,
            })
            .returning();
          if (slotInput.options.length)
            await tx.insert(comboSlotOptions).values(
              slotInput.options.map((option) => ({
                slotId: slot!.id,
                menuItemId: option.menuItemId,
                variantId: option.variantId ?? null,
                upcharge: String(option.upcharge ?? 0),
                isUnlimitedRefill: option.isUnlimitedRefill ?? false,
              })),
            );
        }
        return combo!;
      });
      await writeAudit({
        tenantId: auth.tenantId,
        userId: auth.userId,
        branchId: auth.branchId,
        requestId: auth.requestId,
        ipAddress: auth.ipAddress,
        action: "COMBO_CREATED",
        entity: "combo",
        entityId: created.id,
        metadata: { name: input.name, pricePolicy: input.pricePolicy },
      });
      const canonical = await db.query.combos.findFirst({
        where: and(
          eq(combos.id, created.id),
          eq(combos.tenantId, auth.tenantId),
        ),
        with: { slots: { with: { options: true } } },
      });
      if (!canonical) throw new InternalError("Created combo could not be reloaded");
      return createdResponse(toComboResponse(canonical));
    },
    {
      body,
      response: { 201: comboResponseSchema, ...standardErrorResponseSchemas },
    },
  )

  .patch(
    "/:id",
    async ({ auth, params, body: input }) => {
      requirePermission(auth, "menu:update");
      const existing = await db.query.combos.findFirst({
        where: and(
          eq(combos.id, params.id),
          eq(combos.tenantId, auth.tenantId),
        ),
        with: { slots: { with: { options: true } } },
      });
      if (!existing) throw new ValidationError("Combo not found");
      if (input.pricePolicy === "FIXED" && input.fixedPrice == null)
        throw new ValidationError("A fixed combo price is required");
      if (input.pricePolicy === "PERCENT_OFF_SUM" && input.percentOff == null)
        throw new ValidationError("A percent-off value is required");
      for (const slot of input.slots) {
        if (slot.minSelections > slot.maxSelections)
          throw new ValidationError(
            `${slot.name} has invalid selection limits`,
          );
        if (slot.options.length < slot.minSelections)
          throw new ValidationError(
            `${slot.name} does not have enough options`,
          );
        for (const option of slot.options) {
          const item = await itemRepository.findById(
            auth.tenantId,
            option.menuItemId,
          );
          if (!item)
            throw new ValidationError("Combo option menu item not found");
          assertMenuResourceBranch(auth, item.branchId, { allowShared: true });
          if (
            option.variantId &&
            !item.variants.some((variant) => variant.id === option.variantId)
          )
            throw new ValidationError(
              "Combo option variant does not belong to the selected item",
            );
        }
      }
      const used = await db
        .select({ id: orderItems.id })
        .from(orderItems)
        .where(eq(orderItems.comboId, params.id))
        .limit(1);
      if (used.length > 0)
        throw new ValidationError(
          "This combo has already been used in an order and its structure cannot be edited. Create a new combo version instead.",
        );

      await db.transaction(async (tx) => {
        await tx
          .update(combos)
          .set({
            name: input.name,
            description: input.description ?? null,
            pricePolicy: input.pricePolicy,
            fixedPrice:
              input.fixedPrice == null ? null : String(input.fixedPrice),
            percentOff:
              input.percentOff == null ? null : String(input.percentOff),
            updatedAt: new Date(),
          })
          .where(
            and(eq(combos.id, params.id), eq(combos.tenantId, auth.tenantId)),
          );
        await tx.delete(comboSlots).where(eq(comboSlots.comboId, params.id));
        for (let index = 0; index < input.slots.length; index++) {
          const slotInput = input.slots[index]!;
          const [slot] = await tx
            .insert(comboSlots)
            .values({
              comboId: params.id,
              name: slotInput.name,
              minSelections: slotInput.minSelections,
              maxSelections: slotInput.maxSelections,
              sortOrder: index,
            })
            .returning();
          await tx.insert(comboSlotOptions).values(
            slotInput.options.map((option) => ({
              slotId: slot!.id,
              menuItemId: option.menuItemId,
              variantId: option.variantId ?? null,
              upcharge: String(option.upcharge ?? 0),
              isUnlimitedRefill: option.isUnlimitedRefill ?? false,
            })),
          );
        }
      });
      const updated = await db.query.combos.findFirst({
        where: and(
          eq(combos.id, params.id),
          eq(combos.tenantId, auth.tenantId),
        ),
        with: { slots: { with: { options: true } } },
      });
      await writeAudit({
        tenantId: auth.tenantId,
        userId: auth.userId,
        branchId: auth.branchId,
        requestId: auth.requestId,
        ipAddress: auth.ipAddress,
        action: "COMBO_UPDATED",
        entity: "combo",
        entityId: params.id,
        metadata: { name: input.name, pricePolicy: input.pricePolicy },
      });
      if (!updated) throw new InternalError("Updated combo could not be reloaded");
      return successResponse(toComboResponse(updated));
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      body,
      response: { 200: comboResponseSchema, ...standardErrorResponseSchemas },
    },
  )
  .delete(
    "/:id",
    async ({ auth, params }) => {
      requirePermission(auth, "menu:delete");
      const used = await db
        .select({ id: orderItems.id })
        .from(orderItems)
        .where(eq(orderItems.comboId, params.id))
        .limit(1);
      if (used.length > 0)
        throw new ValidationError(
          "This combo has already been used in an order and cannot be deleted.",
        );
      await db
        .delete(combos)
        .where(
          and(eq(combos.id, params.id), eq(combos.tenantId, auth.tenantId)),
        );
      await writeAudit({
        tenantId: auth.tenantId,
        userId: auth.userId,
        branchId: auth.branchId,
        requestId: auth.requestId,
        ipAddress: auth.ipAddress,
        action: "COMBO_DELETED",
        entity: "combo",
        entityId: params.id,
      });
      return successResponse(null);
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      response: {
        200: nullSuccessResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  );
