export type DataObject = {
    type: string;
    [x: string]: any;
};
export type TypeObject = {
    [x: string]: (data: DataObject) => void;
};

export default function typeAssert(
    data: DataObject,
    typeObject: TypeObject,
    noDefined: (data: TypeObject) => void,
) {
    const keys = Object.keys(typeObject);
    if (data.type) {
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (data.type === key) {
                return typeObject[key](data);
            }
        }
        return noDefined(data);
    }
    return noDefined(data);
}
