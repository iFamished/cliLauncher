import { Auth, Minecraft } from 'msmc';
import { MclcUser } from 'msmc/types/types';
export declare function fromMclcToken(auth: Auth, token: MclcUser, refresh?: boolean): Promise<Minecraft> | Minecraft;
