// Starter stacks offered on first run.

export interface StackTemplate {
	name: string;
	trigger: string;
	icon: string;
	color: string;
	habits: string[];
}

export const STACK_TEMPLATES: StackTemplate[] = [
	{
		name: 'Morning Coffee',
		trigger: 'After I pour my morning coffee',
		icon: '☕',
		color: 'amber',
		habits: ['Drink a glass of water', 'Write my top 3 for today', 'Stretch for 2 minutes']
	},
	{
		name: 'Wind Down',
		trigger: 'After I brush my teeth at night',
		icon: '🌙',
		color: 'violet',
		habits: ['Read 5 pages', 'Write one line in my journal', 'Put my phone on the charger']
	},
	{
		name: 'Desk Reset',
		trigger: 'After I sit down at my desk',
		icon: '💻',
		color: 'sky',
		habits: ['Clear my desk', 'Check my calendar', 'Take 3 deep breaths']
	},
	{
		name: 'Home Arrival',
		trigger: 'After I walk in the door',
		icon: '🏃',
		color: 'emerald',
		habits: ['Hang up my keys', 'Change into comfy clothes', 'Do 10 squats']
	}
];
