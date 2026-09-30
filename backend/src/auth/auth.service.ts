import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuthService {
  constructor(private db: PrismaService, private jwt: JwtService) {}

  private sign(user: any, tenant: any) {
    const token = this.jwt.sign({ sub: user.id, tenantId: user.tenantId, role: user.role, name: user.name });
    return { token, user, tenant };
  }

  async register(i: any) {
    if (!/^01\d{9}$/.test(i.phone)) throw new BadRequestException('সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)');
    if (!i.password || i.password.length < 6) throw new BadRequestException('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের দিন');
    if (await this.db.user.findUnique({ where: { phone: i.phone } }))
      throw new BadRequestException('এই নম্বর দিয়ে আগেই একাউন্ট খোলা আছে');
    const password = await bcrypt.hash(i.password, 10);
    const tenant = await this.db.tenant.create({
      data: {
        name: i.shopName,
        ownerName: i.name,
        phone: i.phone,
        shopType: i.shopType || 'মুদি দোকান',
        users: { create: { name: i.name, phone: i.phone, password, role: 'OWNER' } },
      },
      include: { users: true },
    });
    return this.sign(tenant.users[0], tenant);
  }

  async login(phone: string, password: string) {
    const user = await this.db.user.findUnique({ where: { phone }, include: { tenant: true } });
    if (!user || !(await bcrypt.compare(password, user.password)))
      throw new UnauthorizedException('মোবাইল নম্বর বা পাসওয়ার্ড ভুল');
    return this.sign(user, user.tenant);
  }

  me(userId: string) {
    return this.db.user.findUnique({ where: { id: userId } });
  }
}
