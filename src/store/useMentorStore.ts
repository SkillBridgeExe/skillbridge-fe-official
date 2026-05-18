import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { MENTOR_PROFILE } from '@/lib/mock-data/mentor-dashboard';

export interface PricingPlan {
  title: string;
  price: number | string;
  description: string;
}

export interface MentorState {
  profileSetupCompleted: boolean;
  pricingSetupCompleted: boolean;

  // The mentor's own profile mock data
  myProfile: typeof MENTOR_PROFILE;
  pricingPlans: PricingPlan[];

  setProfileSetupCompleted: (completed: boolean) => void;
  setPricingSetupCompleted: (completed: boolean) => void;

  updateMyProfile: (profile: Partial<typeof MENTOR_PROFILE>) => void;
  updatePricingPlans: (plans: PricingPlan[]) => void;
}

export const useMentorStore = create<MentorState>()(
  devtools(
    persist(
      (set) => ({
        profileSetupCompleted: false,
        pricingSetupCompleted: false,
        
        myProfile: MENTOR_PROFILE,
        pricingPlans: [],

        setProfileSetupCompleted: (completed) => set({ profileSetupCompleted: completed }),
        setPricingSetupCompleted: (completed) => set({ pricingSetupCompleted: completed }),
        
        updateMyProfile: (profile) => set((state) => ({ myProfile: { ...state.myProfile, ...profile } })),
        updatePricingPlans: (plans) => set({ pricingPlans: plans }),
      }),
      {
        name: 'skillbridge-mentor-storage',
      }
    )
  )
);
