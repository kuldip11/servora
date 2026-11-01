export const productGuidance: Record<
  string,
  { question: string; answer: string; demo: string }
> = {
  "pos-and-orders": {
    question: "How does an order move from table to kitchen?",
    answer:
      "Keep table context, item choices and order status on the same operational record. During service, staff need to see what was ordered and which team owns the next step.",
    demo: "Walk through a dine-in order, add another round and follow its progress through kitchen preparation and billing.",
  },
  "menu-management": {
    question: "How do menu choices stay consistent?",
    answer:
      "Categories, variants and modifiers define what can be ordered. Availability controls help ordering teams work from the same catalog rather than maintaining separate versions of the menu.",
    demo: "Bring an item with sizes or add-ons and check how it appears to staff and guests, including when it becomes unavailable.",
  },
  "qr-ordering": {
    question: "Is this a digital menu or an ordering workflow?",
    answer:
      "Servora supports guest menu browsing and order placement from a QR customer session. The order connects with restaurant operations instead of ending at a read-only menu.",
    demo: "Scan a table QR code, choose items and follow the order into the kitchen. Review session handling and guest payment requirements with the team.",
  },
  "kitchen-display": {
    question: "What context does the kitchen receive?",
    answer:
      "Kitchen teams use tickets and order progress to coordinate preparation. A connected display helps the front of house and kitchen refer to the same order context during service.",
    demo: "Send an order with modifiers, review the ticket and update preparation status while checking what the service team sees.",
  },
  "billing-and-payments": {
    question: "How do billing changes fit the service workflow?",
    answer:
      "Bills, payment methods and refund workflows stay connected to the order record. Split and merged bills can be reviewed alongside the restaurant’s actual table-service process.",
    demo: "Walk through splitting a bill, collecting payment and reviewing a refund. Confirm payment-provider setup, supported methods and reconciliation requirements.",
  },
  "staff-and-roles": {
    question: "Who should have access to each operation?",
    answer:
      "Role-based permissions and branch context let restaurant teams work within their responsibilities. Managers should review access for cashiers, waiters, kitchen staff and administrators.",
    demo: "Compare the same workflow using different staff roles and confirm who can change menus, manage bills and view reports.",
  },
  inventory: {
    question: "How do recipes and stock connect to availability?",
    answer:
      "Restaurant stock and recipe workflows connect inventory records with daily operations. Reviewing ingredient usage and availability together helps teams understand the relationship between what is stocked and what can be served.",
    demo: "Bring a recipe and its ingredients. Review stock changes, recipe mapping and availability behavior for the menu item.",
  },
  analytics: {
    question: "Which reports help with daily restaurant decisions?",
    answer:
      "Order and operational dashboards provide a way to review restaurant activity. Start with the decisions your managers make each day and check the relevant reports, filters and branch context.",
    demo: "Review a typical service period, compare the available views and confirm the reporting definitions your team needs.",
  },
  "multi-branch": {
    question: "What is shared and what belongs to a branch?",
    answer:
      "Restaurant groups need organization-wide context alongside branch-specific workflows. Branch-aware access and menu availability should be reviewed as part of the operating model for each location.",
    demo: "Compare two branches, review menu overrides and staff permissions, and confirm the rollout and reporting requirements for your group.",
  },
  security: {
    question: "How is operational access controlled?",
    answer:
      "Authentication, role permissions and tenant isolation define access to restaurant operations. Review the actual responsibilities of each team rather than giving every user administrative access.",
    demo: "Review sign-in, branch access, role boundaries and the actions available to each team. Ask for the security and data-handling details required by your organization.",
  },
};
