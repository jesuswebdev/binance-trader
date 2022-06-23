import { customAlphabet } from 'nanoid';
import { DefaultNamingStrategy } from 'typeorm';

const ALIAS_LENGTH = 10;

// https://github.com/typeorm/typeorm/issues/3118#issuecomment-854998821
export class NamingStrategy extends DefaultNamingStrategy {
  private _aliasCache: { [key: string]: string } = {};

  eagerJoinRelationAlias(alias: string, propertyPath: string): string {
    const key = `${alias}:${propertyPath}`;

    if (this._aliasCache[key]) {
      return this._aliasCache[key];
    }

    const orig = super.eagerJoinRelationAlias(alias, propertyPath);
    const characters = orig.replace(/_/g, '').toUpperCase();
    const nanoid = customAlphabet(characters, ALIAS_LENGTH);
    const out = nanoid();

    this._aliasCache[key] = out;

    return out;
  }
}
