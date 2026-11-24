import type {
  AuthSession,
  AuthUser,
  Conversation,
  ConversationSummary,
  DietaryPreference,
  FoodItem,
  Menu,
  MenuMeal,
  MenuSummary,
  MenuVersion,
  Message,
  NutritionGoal,
  Page,
  Profile,
  Recipe,
  RecipeNutrition,
  RecipeSnapshot,
  SuggestedMenu,
} from '../api/types';

const NOW = '2026-10-13T10:00:00.000Z';

export function buildFood(overrides: Partial<FoodItem> = {}): FoodItem {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Buckwheat, dry',
    nameEn: 'Buckwheat groats, dry',
    kcalPer100g: 343,
    proteinG: 13.3,
    fatG: 3.4,
    carbsG: 71.5,
    state: 'dried',
    source: 'seed',
    sourceId: 'buckwheat-dry',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

export function buildRecipe(overrides: Partial<Recipe> = {}): Recipe {
  const food = buildFood();
  return {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Buckwheat with chicken',
    description: 'A simple lunch.',
    instructions: 'Boil the buckwheat.',
    mealType: 'lunch',
    dietType: ['high_protein'],
    allergens: [],
    servings: 2,
    prepTimeMinutes: 30,
    source: 'manual',
    sourceId: null,
    createdAt: NOW,
    updatedAt: NOW,
    ingredients: [
      {
        id: '33333333-3333-4333-8333-333333333333',
        foodItemId: food.id,
        quantityG: 150,
        isOptional: false,
        notes: null,
        position: 0,
        foodItem: food,
      },
    ],
    nutritionPerServing: { kcal: 257.3, proteinG: 10, fatG: 2.6, carbsG: 53.6 },
    nutritionComplete: true,
    ...overrides,
  };
}

export function buildNutrition(overrides: Partial<RecipeNutrition> = {}): RecipeNutrition {
  return {
    recipeId: '22222222-2222-4222-8222-222222222222',
    servings: 2,
    includeOptional: false,
    basis: 'ingredients_sum',
    total: { kcal: 514.5, proteinG: 20, fatG: 5.1, carbsG: 107.3 },
    perServing: { kcal: 257.3, proteinG: 10, fatG: 2.6, carbsG: 53.6 },
    complete: true,
    ingredients: [
      {
        ingredientId: '33333333-3333-4333-8333-333333333333',
        foodItemId: '11111111-1111-4111-8111-111111111111',
        foodName: 'Buckwheat, dry',
        state: 'dried',
        quantityG: 150,
        isOptional: false,
        counted: true,
        macros: { kcal: 514.5, proteinG: 20, fatG: 5.1, carbsG: 107.3 },
        missing: [],
      },
    ],
    ...overrides,
  };
}

export function buildProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: '44444444-4444-4444-8444-444444444444',
    age: 30,
    heightCm: 170,
    weightKg: 65.5,
    sex: 'female',
    activityLevel: 'moderate',
    goal: 'maintain',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

export function buildGoal(overrides: Partial<NutritionGoal> = {}): NutritionGoal {
  return {
    id: '55555555-5555-4555-8555-555555555555',
    caloriesKcal: 2100,
    proteinG: 105,
    fatG: 58,
    carbsG: 289,
    calculationMode: 'rule_based',
    ruleVersion: 'mifflin-st-jeor-v1',
    effectiveFrom: NOW,
    ...overrides,
  };
}

export function page<T>(items: T[], overrides: Partial<Page<T>> = {}): Page<T> {
  return { items, total: items.length, page: 1, limit: 20, ...overrides };
}

export function buildPreference(overrides: Partial<DietaryPreference> = {}): DietaryPreference {
  return {
    id: '66666666-6666-4666-8666-666666666666',
    preferenceType: 'allergy',
    value: 'peanut',
    ...overrides,
  };
}

export const MENU_ID = '77777777-7777-4777-8777-777777777777';
export const VERSION_ID = '88888888-8888-4888-8888-888888888888';

export function buildRecipeSnapshot(overrides: Partial<RecipeSnapshot> = {}): RecipeSnapshot {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Buckwheat with chicken',
    mealType: 'lunch',
    dietType: ['high_protein'],
    allergens: [],
    servings: 2,
    prepTimeMinutes: 30,
    perServing: { kcal: 257.3, proteinG: 10, fatG: 2.6, carbsG: 53.6 },
    complete: true,
    ingredients: [
      {
        foodItemId: '11111111-1111-4111-8111-111111111111',
        foodName: 'Buckwheat, dry',
        foodNameEn: null,
        state: 'dried',
        quantityG: 150,
        isOptional: false,
      },
    ],
    ...overrides,
  };
}

export function buildMenuMeal(overrides: Partial<MenuMeal> = {}): MenuMeal {
  return {
    id: '99999999-9999-4999-8999-999999999991',
    mealType: 'lunch',
    position: 0,
    recipeId: '22222222-2222-4222-8222-222222222222',
    servings: 1,
    nutrition: { kcal: 257.3, proteinG: 10, fatG: 2.6, carbsG: 53.6 },
    complete: true,
    recipe: buildRecipeSnapshot(),
    ...overrides,
  };
}

export function buildMenuVersion(overrides: Partial<MenuVersion> = {}): MenuVersion {
  const meal = buildMenuMeal();
  return {
    id: VERSION_ID,
    versionNumber: 1,
    generatedBy: 'stub',
    notes: 'Planned by the stub planner.',
    createdAt: NOW,
    isConfirmed: false,
    nutritionGoal: {
      goalId: '55555555-5555-4555-8555-555555555555',
      caloriesKcal: 2100,
      proteinG: 105,
      fatG: 58,
      carbsG: 289,
      calculationMode: 'rule_based',
      ruleVersion: 'mifflin-st-jeor-v2',
    },
    dailyAverage: meal.nutrition,
    issues: [],
    days: [
      {
        id: '99999999-9999-4999-8999-999999999990',
        dayIndex: 0,
        date: '2026-10-20',
        totals: meal.nutrition,
        complete: true,
        meals: [meal],
      },
    ],
    ...overrides,
  };
}

export function buildMenu(overrides: Partial<Menu> = {}): Menu {
  return {
    id: MENU_ID,
    title: 'Menu for 1 day',
    confirmedVersionId: null,
    confirmedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    versions: [buildMenuVersion()],
    ...overrides,
  };
}

export function buildMenuSummary(overrides: Partial<MenuSummary> = {}): MenuSummary {
  return {
    id: MENU_ID,
    title: 'Menu for 1 day',
    versionCount: 1,
    confirmedVersionId: null,
    confirmedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

export const CONVERSATION_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

export function buildMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    role: 'user',
    content: 'Plan a menu for 3 days',
    menuVersionId: null,
    menuId: null,
    preferenceChange: null,
    wishOffer: null,
    createdAt: NOW,
    ...overrides,
  };
}

export function buildConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: CONVERSATION_ID,
    title: 'New conversation',
    menuId: null,
    createdAt: NOW,
    updatedAt: NOW,
    messages: [],
    ...overrides,
  };
}

export function buildConversationSummary(
  overrides: Partial<ConversationSummary> = {},
): ConversationSummary {
  return {
    id: CONVERSATION_ID,
    title: 'New conversation',
    menuId: null,
    messageCount: 0,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

/** Breakfast and lunch of one day; the lunch recipe was deleted. */
export function buildSuggestedMenu(overrides: Partial<SuggestedMenu> = {}): SuggestedMenu {
  return {
    days: [
      {
        dayIndex: 0,
        date: null,
        meals: [
          {
            position: 0,
            mealType: 'breakfast',
            recipeId: '22222222-2222-4222-8222-222222222222',
            recipeName: 'Oatmeal',
            servings: 1,
            nutrition: { kcal: 302.8, proteinG: 11.2, fatG: 5.9, carbsG: 53.8 },
            complete: true,
          },
          {
            position: 1,
            mealType: 'lunch',
            recipeId: null,
            recipeName: 'Rice bowl',
            servings: 1,
            nutrition: { kcal: 520, proteinG: 10.8, fatG: 1.2, carbsG: 112 },
            complete: true,
          },
        ],
        totals: { kcal: 822.8, proteinG: 22, fatG: 7.1, carbsG: 165.8 },
        complete: true,
      },
    ],
    dailyAverage: { kcal: 822.8, proteinG: 22, fatG: 7.1, carbsG: 165.8 },
    issues: [],
    ...overrides,
  };
}

export function buildUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    email: 'cook@example.com',
    name: 'Olena Cook',
    avatarUrl: null,
    ...overrides,
  };
}

export function buildAuthSession(overrides: Partial<AuthSession> = {}): AuthSession {
  return { user: buildUser(), csrfToken: 'csrf-1', ...overrides };
}
