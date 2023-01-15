### example

```

ActiveRecord.connectionParam = {
    hostname: "---",
    username: "---",
    password: "---",
    db: "--",
};

export class User extends ActiveRecord {}

const u = (await User.first({
    conditions: { id: 4 },
})) as User;

u.name = "new name"
u.save()

```