import { type CardType, createCard, type ICard, type ICardData } from '@paotuan/card'
import { eventBus } from '../utils/eventBus'
import { DefaultCardLinker, type ICardLinker } from './card-linker'

type CardId = string

export interface ICardQuery {
  name?: string
  type?: CardType[]
  isTemplate?: boolean
}

export class CardProvider {
  static readonly INSTANCE = new CardProvider()

  private readonly cardMap = new Map<CardId, ICard>()
  private _linker?: ICardLinker

  private constructor() {
  }

  private get linker() {
    if (!this._linker) {
      this._linker = new DefaultCardLinker()
    }
    return this._linker
  }

  // 允许外部整体替换整个数据结构
  setLinker(linker: ICardLinker) {
    this._linker = linker
  }

  registerCard(id: CardId, card: ICardData) {
    const oldCard = this.cardMap.get(id)
    oldCard?.removeCardEntryChangeListener()
    const newCard = createCard(card)
    newCard.addCardEntryChangeListener(e => eventBus.emit('card-entry-change', e))
    this.cardMap.set(id, newCard)
  }

  unregisterCard(id: CardId) {
    const oldCard = this.cardMap.get(id)
    if (oldCard) {
      oldCard.removeCardEntryChangeListener()
      this.cardMap.delete(id)
    }
    // 删除所有这张卡片的关联关系
    this.linker.deleteCard(id)
  }

  getCardById(id: CardId) {
    return this.cardMap.get(id)
  }

  getLinkMap(channelUnionId: string) {
    return this.linker.getLinkMap(channelUnionId)
  }

  getCard(channelUnionId: string, userId: string) {
    const linkMap = this.getLinkMap(channelUnionId)
    const cardId = linkMap[userId]
    return this.getCardById(cardId)
  }

  linkCard(channelUnionId: string, cardId: string, userId?: string) {
    this.linker.linkCard(channelUnionId, cardId, userId)
  }

  // 根据条件查询人物卡
  queryCard(query: ICardQuery = {}) {
    let list = Array.from(this.cardMap.values())
    if (typeof query.isTemplate === 'boolean') {
      list = list.filter(data => data.isTemplate === query.isTemplate)
    }
    if (Array.isArray(query.type)) {
      list = list.filter(data => query.type!.includes(data.type))
    }
    if (query.name) {
      const keyword = query.name.toLowerCase()
      list = list.filter(data => data.name.toLowerCase().includes(keyword))
    }
    return list
  }
}
