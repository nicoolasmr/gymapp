export type User = {
    id: string;
    email: string;
    full_name?: string;
};

export type Checkin = {
    id: string;
    created_at: string;
    user_id: string;
    academy_id: string;
    users?: User;
};
